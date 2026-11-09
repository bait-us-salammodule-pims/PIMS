import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Inbox,
  Plus,
  RefreshCw,
  Search,
  Eye,
  CheckCircle,
  AlertCircle,
  Clock,
  Send,
  Calendar,
  Warehouse,
  Lock,
  ArrowRight,
  FileCheck,
  Package,
  Layers,
  Printer,
  Ban,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { receivingService } from '../../api/receivingService';
import { procurementService } from '../../api/procurementService';
import { storeService } from '../../api/storeService';
import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  GoodsReceiptStatus,
  GOODS_RECEIPT_STATUS_LABELS,
  GOODS_RECEIPT_STATUS_BADGE_CLASSES,
  type GoodsReceiptResponse,
  type CreateGoodsReceiptDto,
  type CreateReceiptLineItemState,
} from '../../types/receiving';
import {
  PurchaseOrderStatus,
  type PurchaseOrderResponse,
} from '../../types/procurement';
import type { Store } from '../../types/store';

function getTodayIso(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export const GoodsReceiptsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { hasPermission, user } = useAuth();

  const canView = hasPermission('ReceivingView');
  const canCreate = hasPermission('ReceivingCreate');
  const canUpdate = hasPermission('ReceivingUpdate');

  // URL query parameter for pre-selecting PO
  const queryPoId = searchParams.get('poId') || searchParams.get('createPoId');
  const queryReceiptId = searchParams.get('receiptId') || searchParams.get('grnId');

  // Core Data State
  const [receipts, setReceipts] = useState<GoodsReceiptResponse[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderResponse[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [postedReceiptIds, setPostedReceiptIds] = useState<Set<number>>(new Set());

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');

  // Modals & Dialogs
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<GoodsReceiptResponse | null>(null);

  // Workflow Confirmation Dialogs
  const [submitConfirmReceipt, setSubmitConfirmReceipt] = useState<GoodsReceiptResponse | null>(null);
  const [inspectConfirmReceipt, setInspectConfirmReceipt] = useState<GoodsReceiptResponse | null>(null);
  const [recordInspectionConfirmReceipt, setRecordInspectionConfirmReceipt] = useState<GoodsReceiptResponse | null>(null);
  const [postConfirmReceipt, setPostConfirmReceipt] = useState<GoodsReceiptResponse | null>(null);
  const [cancelConfirmReceipt, setCancelConfirmReceipt] = useState<GoodsReceiptResponse | null>(null);

  // Create Form State
  const [selectedPoId, setSelectedPoId] = useState<number | ''>('');
  const [selectedStoreId, setSelectedStoreId] = useState<number | ''>('');
  const [receiptDate, setReceiptDate] = useState<string>(getTodayIso());
  const [deliveryChallanNumber, setDeliveryChallanNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<CreateReceiptLineItemState[]>([]);
  const [createValidationSummary, setCreateValidationSummary] = useState<string | null>(null);

  // Recompute PO line items helper
  const populateLineItems = (po: PurchaseOrderResponse, currentReceipts: GoodsReceiptResponse[]) => {
    const nonCancelledReceipts = currentReceipts.filter(
      (r) => r.purchaseOrderId === po.id && r.status !== GoodsReceiptStatus.Cancelled
    );

    const previouslyReceivedMap = new Map<number, number>();
    nonCancelledReceipts.forEach((r) => {
      r.items.forEach((item) => {
        const current = previouslyReceivedMap.get(item.purchaseOrderItemId) || 0;
        previouslyReceivedMap.set(item.purchaseOrderItemId, current + Number(item.receivedQuantity));
      });
    });

    const initialLines: CreateReceiptLineItemState[] = po.items.map((poItem) => {
      const previouslyReceived = previouslyReceivedMap.get(poItem.id) || 0;
      const remaining = Math.max(0, Number(poItem.quantity) - previouslyReceived);
      const isEligible = remaining > 0;

      return {
        purchaseOrderItemId: poItem.id,
        itemId: poItem.itemId,
        itemName: poItem.itemName || `Item #${poItem.itemId}`,
        orderedQuantity: Number(poItem.quantity),
        previouslyReceivedQuantity: previouslyReceived,
        remainingQuantity: remaining,
        selected: isEligible,
        receivedQuantity: isEligible ? remaining : 0,
        acceptedQuantity: isEligible ? remaining : 0,
        rejectedQuantity: 0,
        rejectionReason: '',
        remarks: '',
        validationError: null,
      };
    });

    setLineItems(initialLines);
  };

  // Load Data
  const loadData = useCallback(async () => {
    if (!canView) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [receiptList, poList, storeList] = await Promise.all([
        receivingService.getGoodsReceipts(),
        procurementService.getPurchaseOrders(),
        storeService.getStores(),
      ]);

      setReceipts(receiptList);
      setPurchaseOrders(poList);
      setStores(storeList);

      // Check URL query parameters on initial data load
      if (queryReceiptId) {
        const found = receiptList.find((r) => r.id === Number(queryReceiptId));
        if (found) {
          setViewingReceipt(found);
        }
      }

      if (queryPoId) {
        const targetPo = poList.find(
          (p) =>
            p.id === Number(queryPoId) &&
            (p.status === PurchaseOrderStatus.Issued || p.status === PurchaseOrderStatus.PartiallyReceived)
        );
        if (targetPo) {
          setSelectedPoId(targetPo.id);
          const defaultStore = user?.storeId || storeList.find((s) => s.isActive)?.id || '';
          setSelectedStoreId(defaultStore);
          setReceiptDate(getTodayIso());
          populateLineItems(targetPo, receiptList);
          setIsCreateModalOpen(true);
        }
      }

      // Check posting status for accepted or partially accepted receipts
      const eligibleForPosting = receiptList.filter(
        (r) =>
          r.status === GoodsReceiptStatus.Accepted ||
          r.status === GoodsReceiptStatus.PartiallyAccepted
      );

      const postedSet = new Set<number>();
      await Promise.all(
        eligibleForPosting.map(async (r) => {
          const isPosted = await receivingService.checkReceiptPosted(r.storeId, r.receiptNumber);
          if (isPosted) {
            postedSet.add(r.id);
          }
        })
      );
      setPostedReceiptIds(postedSet);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to load Goods Receipts.'));
    } finally {
      setIsLoading(false);
    }
  }, [canView, queryReceiptId, queryPoId, user?.storeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived posting status for viewing receipt
  const isViewingReceiptPosted = useMemo(() => {
    if (!viewingReceipt) return false;
    return postedReceiptIds.has(viewingReceipt.id);
  }, [viewingReceipt, postedReceiptIds]);

  // Async verify posting status if viewing an accepted receipt not yet in postedReceiptIds
  useEffect(() => {
    if (!viewingReceipt) return;
    if (
      viewingReceipt.status !== GoodsReceiptStatus.Accepted &&
      viewingReceipt.status !== GoodsReceiptStatus.PartiallyAccepted
    ) {
      return;
    }
    if (postedReceiptIds.has(viewingReceipt.id)) return;

    let isMounted = true;
    receivingService
      .checkReceiptPosted(viewingReceipt.storeId, viewingReceipt.receiptNumber)
      .then((posted) => {
        if (isMounted && posted) {
          setPostedReceiptIds((prev) => new Set(prev).add(viewingReceipt.id));
        }
      })
      .catch(() => { });

    return () => {
      isMounted = false;
    };
  }, [viewingReceipt, postedReceiptIds]);

  // Filter Purchase Orders for eligibility:
  // Backend rule: Goods can only be received against an Issued (3) or PartiallyReceived (4) PO.
  const eligiblePurchaseOrders = useMemo(() => {
    return purchaseOrders.filter(
      (po) =>
        po.status === PurchaseOrderStatus.Issued ||
        po.status === PurchaseOrderStatus.PartiallyReceived
    );
  }, [purchaseOrders]);

  // Lookups
  const storesMap = useMemo(() => {
    const map = new Map<number, Store>();
    stores.forEach((s) => map.set(s.id, s));
    return map;
  }, [stores]);

  const poMap = useMemo(() => {
    const map = new Map<number, PurchaseOrderResponse>();
    purchaseOrders.forEach((po) => map.set(po.id, po));
    return map;
  }, [purchaseOrders]);

  // Active stores for destination dropdown
  const activeStores = useMemo(() => {
    return stores.filter((s) => s.isActive);
  }, [stores]);

  // Current selected PO for creation
  const selectedPo = useMemo(() => {
    if (!selectedPoId) return null;
    return eligiblePurchaseOrders.find((po) => po.id === Number(selectedPoId)) || null;
  }, [eligiblePurchaseOrders, selectedPoId]);

  // Recompute PO line items whenever selected PO changes
  const populateLineItemsForPo = useCallback(
    (po: PurchaseOrderResponse) => {
      populateLineItems(po, receipts);
    },
    [receipts]
  );

  // Handle opening Create Modal manually
  const handleOpenCreateModal = () => {
    const firstPo = eligiblePurchaseOrders[0];
    const initialPoId = firstPo ? firstPo.id : '';
    setSelectedPoId(initialPoId);
    setSelectedStoreId(user?.storeId || (activeStores[0]?.id ?? ''));
    setReceiptDate(getTodayIso());
    setDeliveryChallanNumber('');
    setNotes('');
    setCreateValidationSummary(null);

    if (firstPo) {
      populateLineItemsForPo(firstPo);
    } else {
      setLineItems([]);
    }

    setIsCreateModalOpen(true);
  };

  // Handle PO dropdown selection change in Create Modal
  const handlePoChange = (poId: number) => {
    setSelectedPoId(poId);
    const po = eligiblePurchaseOrders.find((p) => p.id === poId);
    if (po) {
      populateLineItemsForPo(po);
    } else {
      setLineItems([]);
    }
  };

  // Line item change handlers
  const handleLineSelectionToggle = (index: number) => {
    setLineItems((prev) => {
      const next = [...prev];
      const item = next[index];
      const newSelected = !item.selected;
      next[index] = {
        ...item,
        selected: newSelected,
        receivedQuantity: newSelected ? item.remainingQuantity : 0,
        acceptedQuantity: newSelected ? item.remainingQuantity : 0,
        rejectedQuantity: 0,
        validationError: null,
      };
      return next;
    });
  };

  const handleLineReceivedChange = (index: number, val: string) => {
    const num = val === '' ? '' : Math.max(0, Number(val));
    setLineItems((prev) => {
      const next = [...prev];
      const item = next[index];
      const receivedVal = num === '' ? 0 : num;

      let error: string | null = null;
      if (receivedVal > item.remainingQuantity) {
        error = `Cannot exceed remaining receivable qty (${item.remainingQuantity}).`;
      }

      // Default accepted to new received amount, reset rejected
      const acceptedVal = receivedVal;
      const rejectedVal = 0;

      next[index] = {
        ...item,
        receivedQuantity: num,
        acceptedQuantity: acceptedVal,
        rejectedQuantity: rejectedVal,
        validationError: error,
      };
      return next;
    });
  };

  const handleLineAcceptedChange = (index: number, val: string) => {
    const num = val === '' ? '' : Math.max(0, Number(val));
    setLineItems((prev) => {
      const next = [...prev];
      const item = next[index];
      const accepted = num === '' ? 0 : num;
      const received = Number(item.receivedQuantity) || 0;
      const rejected = Number(item.rejectedQuantity) || 0;

      let error: string | null = null;
      if (received > item.remainingQuantity) {
        error = `Cannot exceed remaining receivable qty (${item.remainingQuantity}).`;
      } else if (accepted + rejected > received) {
        error = 'Accepted + Rejected cannot exceed Received qty.';
      }

      next[index] = {
        ...item,
        acceptedQuantity: num,
        validationError: error,
      };
      return next;
    });
  };

  const handleLineRejectedChange = (index: number, val: string) => {
    const num = val === '' ? '' : Math.max(0, Number(val));
    setLineItems((prev) => {
      const next = [...prev];
      const item = next[index];
      const rejected = num === '' ? 0 : num;
      const received = Number(item.receivedQuantity) || 0;
      const accepted = Number(item.acceptedQuantity) || 0;

      let error: string | null = null;
      if (received > item.remainingQuantity) {
        error = `Cannot exceed remaining receivable qty (${item.remainingQuantity}).`;
      } else if (accepted + rejected > received) {
        error = 'Accepted + Rejected cannot exceed Received qty.';
      }

      next[index] = {
        ...item,
        rejectedQuantity: num,
        validationError: error,
      };
      return next;
    });
  };

  const handleLineFieldChange = (
    index: number,
    field: 'rejectionReason' | 'remarks',
    val: string
  ) => {
    setLineItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: val,
      };
      return next;
    });
  };

  // Quick fill all full remaining quantities
  const handleSelectAllFullRemaining = () => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.remainingQuantity <= 0) return item;
        return {
          ...item,
          selected: true,
          receivedQuantity: item.remainingQuantity,
          acceptedQuantity: item.remainingQuantity,
          rejectedQuantity: 0,
          validationError: null,
        };
      })
    );
  };

  // Clear all items selection
  const handleDeselectAll = () => {
    setLineItems((prev) =>
      prev.map((item) => ({
        ...item,
        selected: false,
        receivedQuantity: 0,
        acceptedQuantity: 0,
        rejectedQuantity: 0,
        validationError: null,
      }))
    );
  };

  // Create Form Submission
  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateValidationSummary(null);

    if (!selectedPoId) {
      setCreateValidationSummary('Please select an eligible Purchase Order.');
      return;
    }

    if (!selectedStoreId) {
      setCreateValidationSummary('Please select an active destination Store.');
      return;
    }

    if (!receiptDate) {
      setCreateValidationSummary('Receipt Date is required.');
      return;
    }

    const selectedLines = lineItems.filter(
      (line) => line.selected && Number(line.receivedQuantity) > 0
    );

    if (selectedLines.length === 0) {
      setCreateValidationSummary('At least one item must have Received Quantity greater than zero.');
      return;
    }

    // Check line errors
    for (const line of selectedLines) {
      const received = Number(line.receivedQuantity) || 0;
      const accepted = Number(line.acceptedQuantity) || 0;
      const rejected = Number(line.rejectedQuantity) || 0;

      if (received <= 0) {
        setCreateValidationSummary(`Item "${line.itemName}" has an invalid received quantity.`);
        return;
      }

      if (received > line.remainingQuantity) {
        setCreateValidationSummary(
          `Item "${line.itemName}" received quantity (${received}) exceeds remaining receivable (${line.remainingQuantity}).`
        );
        return;
      }

      if (accepted < 0 || rejected < 0 || accepted + rejected > received) {
        setCreateValidationSummary(
          `Item "${line.itemName}" accepted (${accepted}) + rejected (${rejected}) cannot exceed received (${received}).`
        );
        return;
      }

      if (rejected > 0 && !line.rejectionReason.trim()) {
        setCreateValidationSummary(
          `Item "${line.itemName}" has rejected quantity (${rejected}) but is missing a Rejection Reason.`
        );
        return;
      }
    }

    setIsActionLoading(true);
    setErrorMessage(null);

    const payload: CreateGoodsReceiptDto = {
      purchaseOrderId: Number(selectedPoId),
      storeId: Number(selectedStoreId),
      receiptDate: new Date(receiptDate).toISOString(),
      deliveryChallanNumber: deliveryChallanNumber.trim() || null,
      notes: notes.trim() || null,
      items: selectedLines.map((line) => ({
        purchaseOrderItemId: line.purchaseOrderItemId,
        receivedQuantity: Number(line.receivedQuantity),
        acceptedQuantity: Number(line.acceptedQuantity) || 0,
        rejectedQuantity: Number(line.rejectedQuantity) || 0,
        rejectionReason: line.rejectionReason.trim() || null,
        remarks: line.remarks.trim() || null,
      })),
    };

    try {
      const created = await receivingService.createGoodsReceipt(payload);
      setSuccessMessage(`Goods Receipt "${created.receiptNumber}" created successfully as Draft.`);
      setIsCreateModalOpen(false);
      await loadData();
      // Auto-open detail modal to review
      setViewingReceipt(created);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to create Goods Receipt.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // ==========================================
  // Workflow Action Handlers
  // ==========================================

  // Submit Draft -> Submitted
  const handleSubmitReceipt = async () => {
    if (!submitConfirmReceipt) return;
    setIsActionLoading(true);
    try {
      const updated = await receivingService.submitGoodsReceipt(submitConfirmReceipt.id);
      setSuccessMessage(`Goods Receipt "${updated.receiptNumber}" submitted for inspection.`);
      setSubmitConfirmReceipt(null);
      if (viewingReceipt?.id === updated.id) {
        setViewingReceipt(updated);
      }
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to submit Goods Receipt.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Inspect Submitted -> Inspected
  const handleInspectReceipt = async () => {
    if (!inspectConfirmReceipt) return;
    setIsActionLoading(true);
    try {
      const updated = await receivingService.inspectGoodsReceipt(inspectConfirmReceipt.id);
      setSuccessMessage(
        `Goods Receipt "${updated.receiptNumber}" marked as Inspected. You can now record inspection results.`
      );
      setInspectConfirmReceipt(null);
      if (viewingReceipt?.id === updated.id) {
        setViewingReceipt(updated);
      }
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to start inspection.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Record Inspection Result Inspected -> Accepted / PartiallyAccepted / Rejected
  const handleRecordInspectionResult = async () => {
    if (!recordInspectionConfirmReceipt) return;
    setIsActionLoading(true);
    try {
      const updated = await receivingService.recordInspectionResult(
        recordInspectionConfirmReceipt.id
      );
      const statusLabel = GOODS_RECEIPT_STATUS_LABELS[updated.status];
      setSuccessMessage(
        `Inspection results recorded for "${updated.receiptNumber}". Status is now: ${statusLabel}. Purchase Order fulfillment status has been synchronized.`
      );
      setRecordInspectionConfirmReceipt(null);
      if (viewingReceipt?.id === updated.id) {
        setViewingReceipt(updated);
      }
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to record inspection results.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Post to Inventory Accepted / PartiallyAccepted -> Inventory Balances updated
  const handlePostToInventory = async () => {
    if (!postConfirmReceipt) return;
    setIsActionLoading(true);
    try {
      const updated = await receivingService.postToInventory(postConfirmReceipt.id);
      setSuccessMessage(
        `Goods Receipt "${updated.receiptNumber}" successfully posted to Store Inventory! Stock balances and movement logs have been updated.`
      );
      // Update posted set immediately
      setPostedReceiptIds((prev) => new Set(prev).add(updated.id));
      setPostConfirmReceipt(null);
      if (viewingReceipt?.id === updated.id) {
        setViewingReceipt(updated);
      }
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to post Goods Receipt to inventory.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Cancel Receipt Draft / Submitted / Inspected -> Cancelled
  const handleCancelReceipt = async () => {
    if (!cancelConfirmReceipt) return;
    setIsActionLoading(true);
    try {
      const updated = await receivingService.cancelGoodsReceipt(cancelConfirmReceipt.id);
      setSuccessMessage(`Goods Receipt "${updated.receiptNumber}" has been cancelled.`);
      setCancelConfirmReceipt(null);
      if (viewingReceipt?.id === updated.id) {
        setViewingReceipt(updated);
      }
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to cancel Goods Receipt.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Printable Document Trigger
  const handlePrint = () => {
    window.print();
  };

  // Filtered Receipts List
  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      if (statusFilter !== 'all' && r.status !== Number(statusFilter)) {
        return false;
      }
      if (storeFilter !== 'all' && r.storeId !== Number(storeFilter)) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesNum = r.receiptNumber.toLowerCase().includes(query);
        const matchesPo = (r.purchaseOrderNumber || '').toLowerCase().includes(query);
        const matchesChallan = (r.deliveryChallanNumber || '').toLowerCase().includes(query);
        const matchesNotes = (r.notes || '').toLowerCase().includes(query);

        const storeName = storesMap.get(r.storeId)?.name.toLowerCase() || '';
        const matchesStore = storeName.includes(query);

        const po = poMap.get(r.purchaseOrderId);
        const matchesVendor = (po?.vendorName || '').toLowerCase().includes(query);

        return matchesNum || matchesPo || matchesChallan || matchesNotes || matchesStore || matchesVendor;
      }
      return true;
    });
  }, [receipts, statusFilter, storeFilter, searchQuery, storesMap, poMap]);

  // Statistics Summary
  const stats = useMemo(() => {
    const total = receipts.length;
    const draft = receipts.filter((r) => r.status === GoodsReceiptStatus.Draft).length;
    const submitted = receipts.filter((r) => r.status === GoodsReceiptStatus.Submitted).length;
    const inspected = receipts.filter((r) => r.status === GoodsReceiptStatus.Inspected).length;
    const accepted = receipts.filter((r) => r.status === GoodsReceiptStatus.Accepted).length;
    const partiallyAccepted = receipts.filter(
      (r) => r.status === GoodsReceiptStatus.PartiallyAccepted
    ).length;
    const rejected = receipts.filter((r) => r.status === GoodsReceiptStatus.Rejected).length;
    const cancelled = receipts.filter((r) => r.status === GoodsReceiptStatus.Cancelled).length;

    return {
      total,
      draft,
      submitted,
      inspected,
      accepted,
      partiallyAccepted,
      rejected,
      cancelled,
      pendingInspection: draft + submitted,
      finalized: accepted + partiallyAccepted,
    };
  }, [receipts]);

  // Totals for Create Form
  const formTotals = useMemo(() => {
    const selectedLines = lineItems.filter((line) => line.selected);
    const totalOrdered = selectedLines.reduce((acc, l) => acc + l.orderedQuantity, 0);
    const totalReceived = selectedLines.reduce(
      (acc, l) => acc + (Number(l.receivedQuantity) || 0),
      0
    );
    const totalAccepted = selectedLines.reduce(
      (acc, l) => acc + (Number(l.acceptedQuantity) || 0),
      0
    );
    const totalRejected = selectedLines.reduce(
      (acc, l) => acc + (Number(l.rejectedQuantity) || 0),
      0
    );

    return {
      selectedCount: selectedLines.length,
      totalOrdered,
      totalReceived,
      totalAccepted,
      totalRejected,
    };
  }, [lineItems]);

  // Helper to render Status Badge
  const renderStatusBadge = (status: GoodsReceiptStatus) => {
    const badgeClass = GOODS_RECEIPT_STATUS_BADGE_CLASSES[status] || 'badge-secondary';
    const label = GOODS_RECEIPT_STATUS_LABELS[status] || 'Unknown';

    switch (status) {
      case GoodsReceiptStatus.Draft:
        return <span className={`badge ${badgeClass}`}>{label}</span>;
      case GoodsReceiptStatus.Submitted:
        return (
          <span className={`badge ${badgeClass}`} title="Submitted, ready for physical goods inspection">
            <Clock size={12} /> {label}
          </span>
        );
      case GoodsReceiptStatus.Inspected:
        return (
          <span className={`badge ${badgeClass}`} title="Inspection in progress, decision pending">
            <Layers size={12} /> {label}
          </span>
        );
      case GoodsReceiptStatus.Accepted:
        return (
          <span className={`badge ${badgeClass}`} title="All received goods inspected and accepted">
            <CheckCircle size={12} /> {label}
          </span>
        );
      case GoodsReceiptStatus.PartiallyAccepted:
        return (
          <span className={`badge ${badgeClass}`} title="Some quantities accepted and some rejected">
            <CheckCircle size={12} /> {label}
          </span>
        );
      case GoodsReceiptStatus.Rejected:
        return (
          <span className={`badge ${badgeClass}`} title="Shipment rejected during inspection">
            <Ban size={12} /> {label}
          </span>
        );
      case GoodsReceiptStatus.Cancelled:
        return <span className={`badge ${badgeClass}`}>{label}</span>;
      default:
        return <span className={`badge ${badgeClass}`}>{label}</span>;
    }
  };

  // Access check
  if (!canView) {
    return (
      <div className="content-container">
        <div className="card text-center" style={{ padding: '3rem 1.5rem' }}>
          <Lock size={48} className="text-muted" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--navy-900)' }}>
            Access Restricted
          </h2>
          <p className="text-muted" style={{ maxWidth: 420, margin: '0.5rem auto 0' }}>
            You do not have permission to view Goods Receipts (GRN). Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-title">
          <div className="page-header-icon">
            <Inbox size={24} />
          </div>
          <div>
            <h1>Goods Receipts (GRN)</h1>
            <p className="page-header-subtitle">
              Receive consignments against Purchase Orders, perform quality inspection, and post verified stock to stores.
            </p>
          </div>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadData}
            disabled={isLoading}
            title="Refresh goods receipts"
          >
            <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          {canCreate && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenCreateModal}
            >
              <Plus size={16} />
              <span>Create Goods Receipt</span>
            </button>
          )}
        </div>
      </div>

      {/* Alert Messages */}
      {errorMessage && (
        <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={18} />
          <div style={{ flex: 1 }}>{errorMessage}</div>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: '0.2rem', color: 'inherit' }}
            onClick={() => setErrorMessage(null)}
          >
            &times;
          </button>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success" style={{ marginBottom: '1.25rem' }}>
          <CheckCircle size={18} />
          <div style={{ flex: 1 }}>{successMessage}</div>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: '0.2rem', color: 'inherit' }}
            onClick={() => setSuccessMessage(null)}
          >
            &times;
          </button>
        </div>
      )}

      {/* Operational Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Total Goods Receipts
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--navy-900)' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            All historical GRNs
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Awaiting Inspection
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: '#d97706' }}>
            {stats.pendingInspection}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '0.25rem' }}>
            {stats.draft} Draft • {stats.submitted} Submitted
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Under Inspection
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: '#7c3aed' }}>
            {stats.inspected}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#7c3aed', marginTop: '0.25rem' }}>
            Pending QA decision
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Accepted / Partially Accepted
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: '#059669' }}>
            {stats.finalized}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.25rem' }}>
            {stats.accepted} Accepted • {stats.partiallyAccepted} Partial
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Rejected / Cancelled
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: '#dc2626' }}>
            {stats.rejected + stats.cancelled}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {stats.rejected} Rejected • {stats.cancelled} Cancelled
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 380 }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '0.875rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Search GRN #, PO #, Challan #, Store, Vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="grn-status-select" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Status:
              </label>
              <select
                id="grn-status-select"
                className="form-input"
                style={{ width: 'auto', paddingRight: '2rem' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses ({receipts.length})</option>
                <option value={GoodsReceiptStatus.Draft}>Draft ({stats.draft})</option>
                <option value={GoodsReceiptStatus.Submitted}>Submitted ({stats.submitted})</option>
                <option value={GoodsReceiptStatus.Inspected}>Inspected ({stats.inspected})</option>
                <option value={GoodsReceiptStatus.Accepted}>Accepted ({stats.accepted})</option>
                <option value={GoodsReceiptStatus.PartiallyAccepted}>
                  Partially Accepted ({stats.partiallyAccepted})
                </option>
                <option value={GoodsReceiptStatus.Rejected}>Rejected ({stats.rejected})</option>
                <option value={GoodsReceiptStatus.Cancelled}>Cancelled ({stats.cancelled})</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="grn-store-select" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Store:
              </label>
              <select
                id="grn-store-select"
                className="form-input"
                style={{ width: 'auto', paddingRight: '2rem' }}
                value={storeFilter}
                onChange={(e) => setStoreFilter(e.target.value)}
              >
                <option value="all">All Stores</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            {(searchQuery || statusFilter !== 'all' || storeFilter !== 'all') && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setStoreFilter('all');
                }}
                style={{ fontSize: '0.8125rem' }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
            <RefreshCw size={28} className="spin text-primary" style={{ margin: '0 auto 0.75rem' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
              Loading Goods Receipts and Store inventory logs...
            </p>
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
            <Inbox size={48} className="text-muted" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--navy-900)' }}>
              No Goods Receipts Found
            </h3>
            <p className="text-muted" style={{ maxWidth: 460, margin: '0.5rem auto 1.25rem' }}>
              {searchQuery || statusFilter !== 'all' || storeFilter !== 'all'
                ? 'No receipts matched your current filter criteria. Try clearing search filters.'
                : 'No delivery receipts have been created yet. When shipments arrive from suppliers, generate a Goods Receipt (GRN) to verify and record delivered quantities.'}
            </p>
            {canCreate && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenCreateModal}
              >
                <Plus size={16} />
                <span>Create First Goods Receipt</span>
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.875rem 1rem' }}>GRN # / Date</th>
                  <th style={{ textAlign: 'left', padding: '0.875rem 1rem' }}>Purchase Order</th>
                  <th style={{ textAlign: 'left', padding: '0.875rem 1rem' }}>Vendor</th>
                  <th style={{ textAlign: 'left', padding: '0.875rem 1rem' }}>Destination Store</th>
                  <th style={{ textAlign: 'center', padding: '0.875rem 1rem' }}>Delivered Lines</th>
                  <th style={{ textAlign: 'center', padding: '0.875rem 1rem' }}>Status</th>
                  <th style={{ textAlign: 'center', padding: '0.875rem 1rem' }}>Inventory Posting</th>
                  <th style={{ textAlign: 'right', padding: '0.875rem 1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.map((receipt) => {
                  const po = poMap.get(receipt.purchaseOrderId);
                  const store = storesMap.get(receipt.storeId);
                  const isPosted = postedReceiptIds.has(receipt.id);

                  const totalReceived = receipt.items.reduce(
                    (acc, i) => acc + Number(i.receivedQuantity),
                    0
                  );
                  const totalAccepted = receipt.items.reduce(
                    (acc, i) => acc + Number(i.acceptedQuantity),
                    0
                  );

                  return (
                    <tr key={receipt.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      {/* GRN # / Date */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>
                          {receipt.receiptNumber}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Calendar size={12} />
                          <span>Received: {formatDate(receipt.receiptDate)}</span>
                          {receipt.deliveryChallanNumber && (
                            <span style={{ marginLeft: '0.25rem' }}>
                              • DC: {receipt.deliveryChallanNumber}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Purchase Order */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 500, color: 'var(--navy-900)' }}>
                          <FileCheck size={14} className="text-primary" />
                          <span>{receipt.purchaseOrderNumber || po?.orderNumber || `PO #${receipt.purchaseOrderId}`}</span>
                        </div>
                        {po && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Ordered: {formatDate(po.orderDate)}
                          </div>
                        )}
                      </td>

                      {/* Vendor */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ fontWeight: 500, color: 'var(--navy-900)' }}>
                          {po?.vendorName || '—'}
                        </div>
                      </td>

                      {/* Destination Store */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Warehouse size={14} className="text-muted" />
                          <span style={{ fontWeight: 500, color: 'var(--navy-900)' }}>
                            {store?.name || `Store #${receipt.storeId}`}
                          </span>
                        </div>
                        {store?.code && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Code: {store.code}
                          </div>
                        )}
                      </td>

                      {/* Delivered Lines summary */}
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                        <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>
                          {receipt.items.length} {receipt.items.length === 1 ? 'item' : 'items'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Rec: {totalReceived.toLocaleString()} • Acc: {totalAccepted.toLocaleString()}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                        {renderStatusBadge(receipt.status)}
                      </td>

                      {/* Inventory Posting Indicator */}
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                        {receipt.status === GoodsReceiptStatus.Accepted ||
                          receipt.status === GoodsReceiptStatus.PartiallyAccepted ? (
                          isPosted ? (
                            <span
                              className="badge badge-success"
                              title="Stock posted to store balance and movements recorded"
                            >
                              <CheckCircle size={12} /> Posted to Store
                            </span>
                          ) : (
                            <span
                              className="badge badge-warning"
                              title="Awaiting posting to store inventory balances"
                            >
                              <Clock size={12} /> Ready to Post
                            </span>
                          )
                        ) : (
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                            —
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setViewingReceipt(receipt)}
                            title="View complete GRN details"
                          >
                            <Eye size={14} />
                            <span>Details</span>
                          </button>

                          {/* Quick Workflow Actions */}
                          {canUpdate && receipt.status === GoodsReceiptStatus.Draft && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => setSubmitConfirmReceipt(receipt)}
                              title="Submit receipt for inspection"
                            >
                              <Send size={13} />
                              <span>Submit</span>
                            </button>
                          )}

                          {canUpdate && receipt.status === GoodsReceiptStatus.Submitted && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => setInspectConfirmReceipt(receipt)}
                              title="Start goods inspection"
                            >
                              <Layers size={13} />
                              <span>Inspect</span>
                            </button>
                          )}

                          {canUpdate && receipt.status === GoodsReceiptStatus.Inspected && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => setRecordInspectionConfirmReceipt(receipt)}
                              title="Record inspection decision and update PO"
                            >
                              <ShieldCheck size={13} />
                              <span>Finalize QA</span>
                            </button>
                          )}

                          {canUpdate &&
                            (receipt.status === GoodsReceiptStatus.Accepted ||
                              receipt.status === GoodsReceiptStatus.PartiallyAccepted) &&
                            !isPosted && (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                                onClick={() => setPostConfirmReceipt(receipt)}
                                title="Post accepted stock into store inventory balance"
                              >
                                <Package size={13} />
                                <span>Post Stock</span>
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* CREATE GOODS RECEIPT MODAL                               */}
      {/* ======================================================== */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          if (!isActionLoading) setIsCreateModalOpen(false);
        }}
        size="lg"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Inbox size={20} className="text-primary" />
            <span>Create Goods Receipt (GRN)</span>
          </div>
        }
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isActionLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreateReceipt}
              disabled={isActionLoading || eligiblePurchaseOrders.length === 0}
            >
              {isActionLoading ? (
                <>
                  <RefreshCw size={14} className="spin" />
                  <span>Saving Receipt...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Save Draft Receipt ({formTotals.selectedCount} lines)</span>
                </>
              )}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateReceipt}>
          {createValidationSummary && (
            <div className="alert alert-danger" style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
              <AlertCircle size={16} />
              <div>{createValidationSummary}</div>
            </div>
          )}

          {eligiblePurchaseOrders.length === 0 ? (
            <div className="alert alert-info" style={{ marginBottom: '1.25rem' }}>
              <AlertCircle size={18} />
              <div style={{ fontSize: '0.875rem' }}>
                <strong>No eligible Purchase Orders found.</strong>
                <p style={{ marginTop: '0.25rem', marginBottom: 0 }}>
                  Under system business rules, Goods Receipts can only be created against Purchase Orders in{' '}
                  <strong>Issued</strong> or <strong>Partially Received</strong> status. Please approve and issue a
                  Purchase Order in the Procurement module first.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: Select Eligible Purchase Order & Store */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1rem',
                }}
              >
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="create-po-select" className="form-label">
                    Eligible Purchase Order <span style={{ color: 'var(--accent-ruby)' }}>*</span>
                  </label>
                  <select
                    id="create-po-select"
                    className="form-input"
                    value={selectedPoId}
                    onChange={(e) => handlePoChange(Number(e.target.value))}
                    required
                  >
                    <option value="" disabled>
                      Select an Issued Purchase Order...
                    </option>
                    {eligiblePurchaseOrders.map((po) => (
                      <option key={po.id} value={po.id}>
                        {po.orderNumber} — {po.vendorName} ({formatDate(po.orderDate)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="create-store-select" className="form-label">
                    Receiving Store Warehouse <span style={{ color: 'var(--accent-ruby)' }}>*</span>
                  </label>
                  <select
                    id="create-store-select"
                    className="form-input"
                    value={selectedStoreId}
                    onChange={(e) => setSelectedStoreId(Number(e.target.value))}
                    required
                  >
                    <option value="" disabled>
                      Select Active Store...
                    </option>
                    {activeStores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selected PO Summary Card */}
              {selectedPo && (
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '0.375rem',
                    padding: '0.75rem 1rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    fontSize: '0.8125rem',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Vendor: </span>
                    <strong style={{ color: 'var(--navy-900)' }}>{selectedPo.vendorName}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>PO Issued Date: </span>
                    <strong style={{ color: 'var(--navy-900)' }}>{formatDate(selectedPo.orderDate)}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Expected Delivery: </span>
                    <strong style={{ color: 'var(--navy-900)' }}>{formatDate(selectedPo.expectedDeliveryDate)}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Order Total: </span>
                    <strong style={{ color: 'var(--navy-900)' }}>${Number(selectedPo.totalAmount).toLocaleString()}</strong>
                  </div>
                </div>
              )}

              {/* Step 2: Receipt Date, Delivery Challan #, Delivery Notes */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1rem',
                }}
              >
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="create-receipt-date" className="form-label">
                    Receipt Date <span style={{ color: 'var(--accent-ruby)' }}>*</span>
                  </label>
                  <input
                    id="create-receipt-date"
                    type="date"
                    className="form-input"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="create-challan-number" className="form-label">
                    Delivery Challan / Bill of Lading #
                  </label>
                  <input
                    id="create-challan-number"
                    type="text"
                    className="form-input"
                    placeholder="e.g. DC-2026-90412"
                    maxLength={100}
                    value={deliveryChallanNumber}
                    onChange={(e) => setDeliveryChallanNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="create-delivery-notes" className="form-label">
                  Delivery Notes / Consignment Remarks
                </label>
                <textarea
                  id="create-delivery-notes"
                  className="form-input"
                  rows={2}
                  placeholder="Gate pass number, carrier name, container/truck seal condition, delivery observations..."
                  maxLength={2000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Step 3: Purchase Order Line Items Receipt Table */}
              <div style={{ marginBottom: '1rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                  }}
                >
                  <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--navy-900)' }}>
                    PO Line Items to Receive
                  </h4>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={handleSelectAllFullRemaining}
                      style={{ fontSize: '0.75rem' }}
                    >
                      Receive Full Remaining
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={handleDeselectAll}
                      style={{ fontSize: '0.75rem' }}
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '0.375rem',
                    overflowX: 'auto',
                    backgroundColor: '#fff',
                  }}
                >
                  <table className="table" style={{ width: '100%', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <th style={{ width: 40, textAlign: 'center' }}>Inc.</th>
                        <th style={{ textAlign: 'left', minWidth: 150 }}>Item Name</th>
                        <th style={{ textAlign: 'right', width: 85 }}>Ordered</th>
                        <th style={{ textAlign: 'right', width: 85 }}>Prev Rec</th>
                        <th style={{ textAlign: 'right', width: 90 }}>Remaining</th>
                        <th style={{ textAlign: 'center', minWidth: 100 }}>Received Qty *</th>
                        <th style={{ textAlign: 'center', minWidth: 95 }}>Accepted</th>
                        <th style={{ textAlign: 'center', minWidth: 95 }}>Rejected</th>
                        <th style={{ textAlign: 'left', minWidth: 160 }}>Rejection Reason</th>
                        <th style={{ textAlign: 'left', minWidth: 140 }}>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, idx) => {
                        const isFullyReceived = item.remainingQuantity <= 0;
                        return (
                          <React.Fragment key={item.purchaseOrderItemId}>
                            <tr
                              style={{
                                backgroundColor: !item.selected || isFullyReceived ? '#f9fafb' : '#fff',
                                opacity: isFullyReceived ? 0.6 : 1,
                              }}
                            >
                              <td style={{ textAlign: 'center', padding: '0.5rem' }}>
                                <input
                                  type="checkbox"
                                  checked={item.selected}
                                  disabled={isFullyReceived}
                                  onChange={() => handleLineSelectionToggle(idx)}
                                />
                              </td>
                              <td style={{ padding: '0.5rem', fontWeight: 500 }}>
                                <div>{item.itemName}</div>
                                {isFullyReceived && (
                                  <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>
                                    Fully Received
                                  </span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right', padding: '0.5rem' }}>
                                {item.orderedQuantity.toLocaleString()}
                              </td>
                              <td style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--text-muted)' }}>
                                {item.previouslyReceivedQuantity.toLocaleString()}
                              </td>
                              <td
                                style={{
                                  textAlign: 'right',
                                  padding: '0.5rem',
                                  fontWeight: 600,
                                  color: item.remainingQuantity > 0 ? 'var(--blue-600)' : 'var(--text-muted)',
                                }}
                              >
                                {item.remainingQuantity.toLocaleString()}
                              </td>
                              <td style={{ padding: '0.5rem' }}>
                                <input
                                  type="number"
                                  step="any"
                                  min={0}
                                  max={item.remainingQuantity}
                                  className="form-input"
                                  style={{
                                    height: '1.875rem',
                                    padding: '0.2rem 0.4rem',
                                    fontSize: '0.8125rem',
                                    textAlign: 'right',
                                  }}
                                  value={item.receivedQuantity}
                                  disabled={!item.selected || isFullyReceived}
                                  onChange={(e) => handleLineReceivedChange(idx, e.target.value)}
                                />
                              </td>
                              <td style={{ padding: '0.5rem' }}>
                                <input
                                  type="number"
                                  step="any"
                                  min={0}
                                  className="form-input"
                                  style={{
                                    height: '1.875rem',
                                    padding: '0.2rem 0.4rem',
                                    fontSize: '0.8125rem',
                                    textAlign: 'right',
                                  }}
                                  value={item.acceptedQuantity}
                                  disabled={!item.selected || isFullyReceived}
                                  onChange={(e) => handleLineAcceptedChange(idx, e.target.value)}
                                />
                              </td>
                              <td style={{ padding: '0.5rem' }}>
                                <input
                                  type="number"
                                  step="any"
                                  min={0}
                                  className="form-input"
                                  style={{
                                    height: '1.875rem',
                                    padding: '0.2rem 0.4rem',
                                    fontSize: '0.8125rem',
                                    textAlign: 'right',
                                    borderColor: Number(item.rejectedQuantity) > 0 ? '#ef4444' : undefined,
                                  }}
                                  value={item.rejectedQuantity}
                                  disabled={!item.selected || isFullyReceived}
                                  onChange={(e) => handleLineRejectedChange(idx, e.target.value)}
                                />
                              </td>
                              <td style={{ padding: '0.5rem' }}>
                                <input
                                  type="text"
                                  className="form-input"
                                  style={{
                                    height: '1.875rem',
                                    padding: '0.2rem 0.4rem',
                                    fontSize: '0.75rem',
                                  }}
                                  placeholder={Number(item.rejectedQuantity) > 0 ? 'Reason required...' : 'Optional'}
                                  value={item.rejectionReason}
                                  disabled={!item.selected || isFullyReceived}
                                  onChange={(e) => handleLineFieldChange(idx, 'rejectionReason', e.target.value)}
                                />
                              </td>
                              <td style={{ padding: '0.5rem' }}>
                                <input
                                  type="text"
                                  className="form-input"
                                  style={{
                                    height: '1.875rem',
                                    padding: '0.2rem 0.4rem',
                                    fontSize: '0.75rem',
                                  }}
                                  placeholder="Line remarks..."
                                  value={item.remarks}
                                  disabled={!item.selected || isFullyReceived}
                                  onChange={(e) => handleLineFieldChange(idx, 'remarks', e.target.value)}
                                />
                              </td>
                            </tr>
                            {item.validationError && item.selected && (
                              <tr key={`${item.purchaseOrderItemId}-err`}>
                                <td colSpan={10} style={{ padding: '0.25rem 0.75rem', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '0.75rem' }}>
                                  ⚠ {item.validationError}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Line Items Summary Footer */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '0.375rem',
                  padding: '0.75rem 1rem',
                  fontSize: '0.8125rem',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Selected Lines: </span>
                  <strong>{formTotals.selectedCount}</strong> of {lineItems.length}
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Total Received: </span>
                  <strong style={{ color: 'var(--navy-900)' }}>{formTotals.totalReceived.toLocaleString()}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Accepted: </span>
                  <strong style={{ color: '#059669' }}>{formTotals.totalAccepted.toLocaleString()}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Rejected: </span>
                  <strong style={{ color: formTotals.totalRejected > 0 ? '#dc2626' : 'var(--text-muted)' }}>
                    {formTotals.totalRejected.toLocaleString()}
                  </strong>
                </div>
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* VIEW GOODS RECEIPT DETAILS MODAL                         */}
      {/* ======================================================== */}
      {viewingReceipt && (
        <Modal
          isOpen={Boolean(viewingReceipt)}
          onClose={() => setViewingReceipt(null)}
          size="lg"
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
              <Inbox size={20} className="text-primary" />
              <span>Goods Receipt Note — {viewingReceipt.receiptNumber}</span>
              <div style={{ marginLeft: 'auto', marginRight: '1rem' }}>
                {renderStatusBadge(viewingReceipt.status)}
              </div>
            </div>
          }
          footer={
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handlePrint}
                  title="Print official GRN voucher"
                >
                  <Printer size={14} />
                  <span>Print GRN</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {/* Workflow Action Buttons */}
                {canUpdate && viewingReceipt.status === GoodsReceiptStatus.Draft && (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => setCancelConfirmReceipt(viewingReceipt)}
                      disabled={isActionLoading}
                    >
                      <Ban size={14} />
                      <span>Cancel Receipt</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setSubmitConfirmReceipt(viewingReceipt)}
                      disabled={isActionLoading}
                    >
                      <Send size={14} />
                      <span>Submit for Inspection</span>
                    </button>
                  </>
                )}

                {canUpdate && viewingReceipt.status === GoodsReceiptStatus.Submitted && (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => setCancelConfirmReceipt(viewingReceipt)}
                      disabled={isActionLoading}
                    >
                      <Ban size={14} />
                      <span>Cancel Receipt</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setInspectConfirmReceipt(viewingReceipt)}
                      disabled={isActionLoading}
                    >
                      <Layers size={14} />
                      <span>Start Goods Inspection</span>
                    </button>
                  </>
                )}

                {canUpdate && viewingReceipt.status === GoodsReceiptStatus.Inspected && (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => setCancelConfirmReceipt(viewingReceipt)}
                      disabled={isActionLoading}
                    >
                      <Ban size={14} />
                      <span>Cancel Receipt</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setRecordInspectionConfirmReceipt(viewingReceipt)}
                      disabled={isActionLoading}
                    >
                      <ShieldCheck size={14} />
                      <span>Record Inspection Outcome</span>
                    </button>
                  </>
                )}

                {canUpdate &&
                  (viewingReceipt.status === GoodsReceiptStatus.Accepted ||
                    viewingReceipt.status === GoodsReceiptStatus.PartiallyAccepted) && (
                    <>
                      {isViewingReceiptPosted ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled
                          style={{ color: '#059669', borderColor: '#059669', backgroundColor: '#ecfdf5' }}
                        >
                          <CheckCircle size={14} />
                          <span>Stock Posted to Inventory</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                          onClick={() => setPostConfirmReceipt(viewingReceipt)}
                          disabled={isActionLoading}
                        >
                          <Package size={14} />
                          <span>Post Accepted Stock to Inventory</span>
                        </button>
                      )}
                    </>
                  )}

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setViewingReceipt(null)}
                >
                  Close
                </button>
              </div>
            </div>
          }
        >
          {/* Workflow Stepper Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.25rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#f8fafc',
              border: '1px solid var(--border-subtle)',
              borderRadius: '0.375rem',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            <div style={{ color: viewingReceipt.status >= GoodsReceiptStatus.Draft ? 'var(--blue-600)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: viewingReceipt.status >= GoodsReceiptStatus.Draft ? '#2563eb' : '#94a3b8', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                1
              </span>
              <span>Draft</span>
            </div>
            <ArrowRight size={14} className="text-muted" />

            <div style={{ color: viewingReceipt.status >= GoodsReceiptStatus.Submitted ? 'var(--blue-600)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: viewingReceipt.status >= GoodsReceiptStatus.Submitted ? '#2563eb' : '#94a3b8', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                2
              </span>
              <span>Submitted</span>
            </div>
            <ArrowRight size={14} className="text-muted" />

            <div style={{ color: viewingReceipt.status >= GoodsReceiptStatus.Inspected ? 'var(--blue-600)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: viewingReceipt.status >= GoodsReceiptStatus.Inspected ? '#2563eb' : '#94a3b8', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                3
              </span>
              <span>Inspected</span>
            </div>
            <ArrowRight size={14} className="text-muted" />

            <div style={{ color: (viewingReceipt.status === GoodsReceiptStatus.Accepted || viewingReceipt.status === GoodsReceiptStatus.PartiallyAccepted) ? '#059669' : viewingReceipt.status === GoodsReceiptStatus.Rejected ? '#dc2626' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: (viewingReceipt.status === GoodsReceiptStatus.Accepted || viewingReceipt.status === GoodsReceiptStatus.PartiallyAccepted) ? '#059669' : viewingReceipt.status === GoodsReceiptStatus.Rejected ? '#dc2626' : '#94a3b8', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                4
              </span>
              <span>Quality Decision</span>
            </div>
            <ArrowRight size={14} className="text-muted" />

            <div style={{ color: isViewingReceiptPosted ? '#059669' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: isViewingReceiptPosted ? '#059669' : '#94a3b8', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                5
              </span>
              <span>Store Posted</span>
            </div>
          </div>

          {/* Posting Status Alert Banner */}
          {(viewingReceipt.status === GoodsReceiptStatus.Accepted ||
            viewingReceipt.status === GoodsReceiptStatus.PartiallyAccepted) && (
              <div
                style={{
                  marginBottom: '1rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.375rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  backgroundColor: isViewingReceiptPosted ? '#ecfdf5' : '#fffbeb',
                  border: `1px solid ${isViewingReceiptPosted ? '#a7f3d0' : '#fde68a'}`,
                  color: isViewingReceiptPosted ? '#065f46' : '#92400e',
                  fontSize: '0.8125rem',
                }}
              >
                {isViewingReceiptPosted ? (
                  <>
                    <CheckCircle size={18} className="text-success" />
                    <div>
                      <strong>Inventory Balance Updated:</strong> Accepted stock from this Goods Receipt has been posted
                      into store balances, and immutable stock movement audit records are created.
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle size={18} style={{ color: '#d97706' }} />
                    <div>
                      <strong>Pending Stock Posting:</strong> Quality inspection is complete and accepted quantities are
                      verified. Click <strong>"Post Accepted Stock to Inventory"</strong> below to update warehouse on-hand
                      balances.
                    </div>
                  </>
                )}
              </div>
            )}

          {/* Metadata Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1.25rem',
              padding: '1rem',
              backgroundColor: '#fff',
              border: '1px solid var(--border-subtle)',
              borderRadius: '0.375rem',
              fontSize: '0.8125rem',
            }}
          >
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Receipt Number</div>
              <strong style={{ color: 'var(--navy-900)', fontSize: '0.9375rem' }}>
                {viewingReceipt.receiptNumber}
              </strong>
            </div>

            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Purchase Order</div>
              <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>
                {viewingReceipt.purchaseOrderNumber || poMap.get(viewingReceipt.purchaseOrderId)?.orderNumber || `PO #${viewingReceipt.purchaseOrderId}`}
              </div>
            </div>

            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Vendor / Supplier</div>
              <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>
                {poMap.get(viewingReceipt.purchaseOrderId)?.vendorName || '—'}
              </div>
            </div>

            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Destination Store</div>
              <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>
                {storesMap.get(viewingReceipt.storeId)?.name || `Store #${viewingReceipt.storeId}`}
              </div>
            </div>

            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Receipt Date</div>
              <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>
                {formatDate(viewingReceipt.receiptDate)}
              </div>
            </div>

            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Delivery Challan #</div>
              <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>
                {viewingReceipt.deliveryChallanNumber || 'None Specified'}
              </div>
            </div>

            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Created At</div>
              <div style={{ color: 'var(--navy-800)' }}>
                {formatDate(viewingReceipt.createdAt)}
              </div>
            </div>

            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Status</div>
              <div>{renderStatusBadge(viewingReceipt.status)}</div>
            </div>
          </div>

          {viewingReceipt.notes && (
            <div
              style={{
                marginBottom: '1.25rem',
                padding: '0.75rem 1rem',
                backgroundColor: '#f8fafc',
                border: '1px solid var(--border-subtle)',
                borderRadius: '0.375rem',
                fontSize: '0.8125rem',
              }}
            >
              <span style={{ fontWeight: 600, color: 'var(--navy-900)' }}>Consignment Remarks: </span>
              <span style={{ color: 'var(--navy-700)' }}>{viewingReceipt.notes}</span>
            </div>
          )}

          {/* Line Items Detail Table */}
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--navy-900)' }}>
              Delivered Goods Inspection Details
            </h4>
            <div
              style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: '0.375rem',
                overflowX: 'auto',
                backgroundColor: '#fff',
              }}
            >
              <table className="table" style={{ width: '100%', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <th style={{ textAlign: 'left', padding: '0.625rem 0.75rem' }}>Item Description</th>
                    <th style={{ textAlign: 'right', padding: '0.625rem 0.75rem' }}>Ordered</th>
                    <th style={{ textAlign: 'right', padding: '0.625rem 0.75rem' }}>Prev Rec</th>
                    <th style={{ textAlign: 'right', padding: '0.625rem 0.75rem' }}>Delivered</th>
                    <th style={{ textAlign: 'right', padding: '0.625rem 0.75rem', color: '#059669' }}>Accepted</th>
                    <th style={{ textAlign: 'right', padding: '0.625rem 0.75rem', color: '#dc2626' }}>Rejected</th>
                    <th style={{ textAlign: 'left', padding: '0.625rem 0.75rem' }}>Rejection Reason</th>
                    <th style={{ textAlign: 'left', padding: '0.625rem 0.75rem' }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingReceipt.items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.625rem 0.75rem', fontWeight: 500 }}>
                        <div>{item.itemName || `Item #${item.itemId}`}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          Item ID: {item.itemId} • PO Line #{item.purchaseOrderItemId}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.625rem 0.75rem' }}>
                        {Number(item.orderedQuantity).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.625rem 0.75rem', color: 'var(--text-muted)' }}>
                        {Number(item.previouslyReceivedQuantity).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.625rem 0.75rem', fontWeight: 600 }}>
                        {Number(item.receivedQuantity).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.625rem 0.75rem', fontWeight: 600, color: '#059669' }}>
                        {Number(item.acceptedQuantity).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.625rem 0.75rem', fontWeight: 600, color: Number(item.rejectedQuantity) > 0 ? '#dc2626' : 'var(--text-muted)' }}>
                        {Number(item.rejectedQuantity).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.625rem 0.75rem', color: Number(item.rejectedQuantity) > 0 ? '#b91c1c' : 'var(--text-muted)' }}>
                        {item.rejectionReason || '—'}
                      </td>
                      <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-muted)' }}>
                        {item.remarks || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* WORKFLOW CONFIRMATION DIALOGS                            */}
      {/* ======================================================== */}

      {/* Submit Confirmation */}
      {submitConfirmReceipt && (
        <ConfirmDialog
          isOpen={Boolean(submitConfirmReceipt)}
          onClose={() => setSubmitConfirmReceipt(null)}
          onConfirm={handleSubmitReceipt}
          title="Submit Goods Receipt"
          message={`Are you sure you want to submit Goods Receipt "${submitConfirmReceipt.receiptNumber}"? This locks draft modifications and queues the delivery for physical inspection and quality review.`}
          confirmLabel="Submit for Inspection"
          variant="warning"
          isLoading={isActionLoading}
        />
      )}

      {/* Start Inspection Confirmation */}
      {inspectConfirmReceipt && (
        <ConfirmDialog
          isOpen={Boolean(inspectConfirmReceipt)}
          onClose={() => setInspectConfirmReceipt(null)}
          onConfirm={handleInspectReceipt}
          title="Start Goods Inspection"
          message={`Start physical quality inspection for Goods Receipt "${inspectConfirmReceipt.receiptNumber}"? This moves the receipt status to Inspected.`}
          confirmLabel="Start Inspection"
          variant="warning"
          isLoading={isActionLoading}
        />
      )}

      {/* Record Inspection Outcome Confirmation */}
      {recordInspectionConfirmReceipt && (
        <ConfirmDialog
          isOpen={Boolean(recordInspectionConfirmReceipt)}
          onClose={() => setRecordInspectionConfirmReceipt(null)}
          onConfirm={handleRecordInspectionResult}
          title="Record Inspection Results"
          message={`Record final inspection outcome for Goods Receipt "${recordInspectionConfirmReceipt.receiptNumber}"? The backend will calculate accepted/rejected totals, transition the receipt to Accepted or Partially Accepted, and update Purchase Order fulfillment status.`}
          confirmLabel="Finalize Inspection"
          variant="success"
          isLoading={isActionLoading}
        />
      )}

      {/* Post to Inventory Confirmation (With Clear Warning) */}
      {postConfirmReceipt && (
        <ConfirmDialog
          isOpen={Boolean(postConfirmReceipt)}
          onClose={() => setPostConfirmReceipt(null)}
          onConfirm={handlePostToInventory}
          title="Post Goods Receipt to Store Inventory"
          message={`WARNING: Posting Goods Receipt "${postConfirmReceipt.receiptNumber}" will permanently credit accepted stock balances into "${storesMap.get(postConfirmReceipt.storeId)?.name || 'store'}" and write immutable stock movement audit records. This operation updates real inventory balances and cannot be undone except through a stock adjustment. Proceed with posting?`}
          confirmLabel="Post to Inventory"
          variant="warning"
          isLoading={isActionLoading}
        />
      )}

      {/* Cancel Receipt Confirmation */}
      {cancelConfirmReceipt && (
        <ConfirmDialog
          isOpen={Boolean(cancelConfirmReceipt)}
          onClose={() => setCancelConfirmReceipt(null)}
          onConfirm={handleCancelReceipt}
          title="Cancel Goods Receipt"
          message={`Are you sure you want to cancel Goods Receipt "${cancelConfirmReceipt.receiptNumber}"? Cancelled receipts cannot be inspected or posted, and any received quantities will be released back to the Purchase Order.`}
          confirmLabel="Cancel Goods Receipt"
          variant="danger"
          isLoading={isActionLoading}
        />
      )}
    </div>
  );
};
