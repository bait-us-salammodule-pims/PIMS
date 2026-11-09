import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Truck,
  Plus,
  RefreshCw,
  Search,
  Eye,
  CheckCircle,
  AlertCircle,
  Clock,
  Send,
  Calendar,
  Lock,
  ArrowRight,
  Printer,
  Ban,
  Check,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Edit2,
} from 'lucide-react';
import { inventoryService } from '../../api/inventoryService';
import { storeService } from '../../api/storeService';
import { itemService } from '../../api/itemService';
import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  StockTransferStatus,
  STOCK_TRANSFER_STATUS_LABELS,
  STOCK_TRANSFER_STATUS_BADGE_CLASSES,
  type StockTransferResponse,
  type CreateStockTransferDto,
  type TransferFormItemState,
} from '../../types/inventory';
import type { Store } from '../../types/store';
import type { Item } from '../../types/item';

function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
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

export const StockTransfersPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { hasPermission, user } = useAuth();
  const canTransfer = hasPermission('InventoryTransfer');

  const queryTransferId = searchParams.get('transferId') || searchParams.get('id');

  // Core Data State
  const [transfers, setTransfers] = useState<StockTransferResponse[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingTransfer, setViewingTransfer] = useState<StockTransferResponse | null>(null);

  // Notes Edit Modal
  const [isEditNotesModalOpen, setIsEditNotesModalOpen] = useState(false);
  const [editNotesValue, setEditNotesValue] = useState('');

  // Workflow Confirmation Dialogs
  const [submitConfirmTransfer, setSubmitConfirmTransfer] = useState<StockTransferResponse | null>(null);
  const [approveConfirmTransfer, setApproveConfirmTransfer] = useState<StockTransferResponse | null>(null);
  const [approverName, setApproverName] = useState('');
  const [rejectConfirmTransfer, setRejectConfirmTransfer] = useState<StockTransferResponse | null>(null);
  const [dispatchConfirmTransfer, setDispatchConfirmTransfer] = useState<StockTransferResponse | null>(null);
  const [receiveConfirmTransfer, setReceiveConfirmTransfer] = useState<StockTransferResponse | null>(null);
  const [cancelConfirmTransfer, setCancelConfirmTransfer] = useState<StockTransferResponse | null>(null);

  // Create Form State
  const [sourceStoreId, setSourceStoreId] = useState<number | ''>('');
  const [destinationStoreId, setDestinationStoreId] = useState<number | ''>('');
  const [requestedBy, setRequestedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<TransferFormItemState[]>([]);
  const [createValidationSummary, setCreateValidationSummary] = useState<string | null>(null);

  // Source Store Balances Cache for checking availability in Create Modal
  const [sourceStoreBalances, setSourceStoreBalances] = useState<Map<number, number>>(new Map());

  // Load Data
  const loadData = useCallback(async () => {
    if (!canTransfer) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [transferList, storeList, itemList] = await Promise.all([
        inventoryService.getStockTransfers(),
        storeService.getStores(),
        itemService.getItems(),
      ]);

      setTransfers(transferList);
      setStores(storeList);
      setItems(itemList);

      // Open detail if queryTransferId is present
      if (queryTransferId) {
        const found = transferList.find((t) => t.id === Number(queryTransferId));
        if (found) {
          setViewingTransfer(found);
        }
      }
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to load stock transfers.'));
    } finally {
      setIsLoading(false);
    }
  }, [canTransfer, queryTransferId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Active Stores & Items
  const activeStores = useMemo(() => stores.filter((s) => s.isActive), [stores]);
  const activeItems = useMemo(() => items.filter((i) => i.isActive), [items]);

  // Load available balances whenever sourceStoreId changes in Create Modal
  useEffect(() => {
    if (!sourceStoreId) {
      setSourceStoreBalances(new Map());
      return;
    }

    let isMounted = true;
    inventoryService
      .getBalances(Number(sourceStoreId))
      .then((bList) => {
        if (!isMounted) return;
        const bMap = new Map<number, number>();
        bList.forEach((b) => bMap.set(b.itemId, Number(b.availableQuantity)));
        setSourceStoreBalances(bMap);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [sourceStoreId]);

  // Handle open Create Modal
  const handleOpenCreateModal = () => {
    const defaultSource = user?.storeId || (activeStores[0]?.id ?? '');
    const defaultDest = activeStores.find((s) => s.id !== defaultSource)?.id ?? '';

    setSourceStoreId(defaultSource);
    setDestinationStoreId(defaultDest);
    setRequestedBy(user?.fullName || '');
    setNotes('');
    setCreateValidationSummary(null);

    // Initial 1 line item
    setLineItems([
      {
        key: 'line-1',
        itemId: activeItems[0]?.id ?? '',
        requestedQuantity: 1,
        notes: '',
      },
    ]);

    setIsCreateModalOpen(true);
  };

  // Add line item
  const handleAddLineItem = () => {
    const usedItemIds = new Set(lineItems.map((l) => Number(l.itemId)).filter(Boolean));
    const nextAvailableItem = activeItems.find((i) => !usedItemIds.has(i.id));

    setLineItems((prev) => [
      ...prev,
      {
        key: `line-${Date.now()}-${Math.random()}`,
        itemId: nextAvailableItem?.id ?? '',
        requestedQuantity: 1,
        notes: '',
      },
    ]);
  };

  // Remove line item
  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Line item change
  const handleLineItemChange = (
    index: number,
    field: 'itemId' | 'requestedQuantity' | 'notes',
    value: string | number
  ) => {
    setLineItems((prev) => {
      const next = [...prev];
      if (field === 'requestedQuantity') {
        const num = value === '' ? '' : Math.max(0, Number(value));
        next[index] = { ...next[index], requestedQuantity: num };
      } else if (field === 'itemId') {
        next[index] = { ...next[index], itemId: value === '' ? '' : Number(value) };
      } else {
        next[index] = { ...next[index], notes: String(value) };
      }
      return next;
    });
  };

  // Create Transfer Submit
  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateValidationSummary(null);

    if (!sourceStoreId) {
      setCreateValidationSummary('Source Store is required.');
      return;
    }

    if (!destinationStoreId) {
      setCreateValidationSummary('Destination Store is required.');
      return;
    }

    if (sourceStoreId === destinationStoreId) {
      setCreateValidationSummary('Source and Destination stores must be different.');
      return;
    }

    if (lineItems.length === 0) {
      setCreateValidationSummary('At least one item is required in the transfer.');
      return;
    }

    // Validate item duplicates and quantities
    const itemIds = new Set<number>();
    for (let i = 0; i < lineItems.length; i++) {
      const line = lineItems[i];
      if (!line.itemId) {
        setCreateValidationSummary(`Line #${i + 1}: Please select an item.`);
        return;
      }

      if (itemIds.has(Number(line.itemId))) {
        setCreateValidationSummary(`Line #${i + 1}: Duplicate items are not allowed in the transfer.`);
        return;
      }
      itemIds.add(Number(line.itemId));

      const qty = Number(line.requestedQuantity);
      if (!qty || qty <= 0) {
        setCreateValidationSummary(`Line #${i + 1}: Requested quantity must be greater than zero.`);
        return;
      }
    }

    setIsActionLoading(true);
    setErrorMessage(null);

    const payload: CreateStockTransferDto = {
      sourceStoreId: Number(sourceStoreId),
      destinationStoreId: Number(destinationStoreId),
      requestedBy: requestedBy.trim() || null,
      notes: notes.trim() || null,
      items: lineItems.map((l) => ({
        itemId: Number(l.itemId),
        requestedQuantity: Number(l.requestedQuantity),
        notes: l.notes.trim() || null,
      })),
    };

    try {
      const created = await inventoryService.createStockTransfer(payload);
      setSuccessMessage(`Stock Transfer "${created.transferNumber}" created as Draft.`);
      setIsCreateModalOpen(false);
      await loadData();
      setViewingTransfer(created);
    } catch (err) {
      setCreateValidationSummary(extractErrorMessage(err, 'Failed to create stock transfer.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // ==========================================
  // Workflow Action Handlers
  // ==========================================

  // Submit Draft -> Submitted
  const handleSubmitTransfer = async () => {
    if (!submitConfirmTransfer) return;
    setIsActionLoading(true);
    try {
      const updated = await inventoryService.submitStockTransfer(submitConfirmTransfer.id);
      setSuccessMessage(`Transfer "${updated.transferNumber}" submitted for supervisor approval.`);
      setSubmitConfirmTransfer(null);
      if (viewingTransfer?.id === updated.id) setViewingTransfer(updated);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to submit stock transfer.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Approve Submitted -> Approved
  const handleApproveTransfer = async () => {
    if (!approveConfirmTransfer) return;
    const approver = approverName.trim() || user?.fullName || 'Supervisor';
    setIsActionLoading(true);
    try {
      const updated = await inventoryService.approveStockTransfer(approveConfirmTransfer.id, approver);
      setSuccessMessage(`Transfer "${updated.transferNumber}" approved by ${approver}. Ready for dispatch.`);
      setApproveConfirmTransfer(null);
      if (viewingTransfer?.id === updated.id) setViewingTransfer(updated);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to approve stock transfer.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Reject Submitted -> Rejected
  const handleRejectTransfer = async () => {
    if (!rejectConfirmTransfer) return;
    setIsActionLoading(true);
    try {
      const updated = await inventoryService.rejectStockTransfer(rejectConfirmTransfer.id);
      setSuccessMessage(`Transfer "${updated.transferNumber}" has been rejected.`);
      setRejectConfirmTransfer(null);
      if (viewingTransfer?.id === updated.id) setViewingTransfer(updated);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to reject stock transfer.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Dispatch Approved -> Dispatched (Deducts stock from source store!)
  const handleDispatchTransfer = async () => {
    if (!dispatchConfirmTransfer) return;
    setIsActionLoading(true);
    try {
      const updated = await inventoryService.dispatchStockTransfer(dispatchConfirmTransfer.id);
      setSuccessMessage(
        `Transfer "${updated.transferNumber}" marked Dispatched! Stock has been deducted from ${updated.sourceStoreName} and TransferOut movements logged.`
      );
      setDispatchConfirmTransfer(null);
      if (viewingTransfer?.id === updated.id) setViewingTransfer(updated);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to dispatch stock transfer.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Receive Dispatched -> Received (Adds stock to destination store!)
  const handleReceiveTransfer = async () => {
    if (!receiveConfirmTransfer) return;
    setIsActionLoading(true);
    try {
      const updated = await inventoryService.receiveStockTransfer(receiveConfirmTransfer.id);
      setSuccessMessage(
        `Transfer "${updated.transferNumber}" completed! Stock has been added to ${updated.destinationStoreName} and TransferIn movements logged.`
      );
      setReceiveConfirmTransfer(null);
      if (viewingTransfer?.id === updated.id) setViewingTransfer(updated);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to receive stock transfer.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Cancel Draft / Submitted / Approved -> Cancelled
  const handleCancelTransfer = async () => {
    if (!cancelConfirmTransfer) return;
    setIsActionLoading(true);
    try {
      const updated = await inventoryService.cancelStockTransfer(cancelConfirmTransfer.id);
      setSuccessMessage(`Transfer "${updated.transferNumber}" has been cancelled.`);
      setCancelConfirmTransfer(null);
      if (viewingTransfer?.id === updated.id) setViewingTransfer(updated);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to cancel stock transfer.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Update Notes (Draft only)
  const handleSaveNotes = async () => {
    if (!viewingTransfer) return;
    setIsActionLoading(true);
    try {
      const updated = await inventoryService.updateStockTransferNotes(
        viewingTransfer.id,
        editNotesValue.trim() || null
      );
      setSuccessMessage(`Transfer notes updated successfully.`);
      setViewingTransfer(updated);
      setIsEditNotesModalOpen(false);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to update transfer notes.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Printable Document Trigger
  const handlePrint = () => {
    window.print();
  };

  // Filtered Transfers
  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      if (statusFilter !== 'all' && t.status !== Number(statusFilter)) {
        return false;
      }

      if (storeFilter !== 'all') {
        const sId = Number(storeFilter);
        if (t.sourceStoreId !== sId && t.destinationStoreId !== sId) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = t.transferNumber.toLowerCase().includes(q);
        const matchesSource = t.sourceStoreName.toLowerCase().includes(q);
        const matchesDest = t.destinationStoreName.toLowerCase().includes(q);
        const matchesReq = (t.requestedBy || '').toLowerCase().includes(q);
        const matchesAppr = (t.approvedBy || '').toLowerCase().includes(q);
        const matchesNotes = (t.notes || '').toLowerCase().includes(q);
        return matchesNum || matchesSource || matchesDest || matchesReq || matchesAppr || matchesNotes;
      }

      return true;
    });
  }, [transfers, statusFilter, storeFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = transfers.length;
    const draft = transfers.filter((t) => t.status === StockTransferStatus.Draft).length;
    const submitted = transfers.filter((t) => t.status === StockTransferStatus.Submitted).length;
    const approved = transfers.filter((t) => t.status === StockTransferStatus.Approved).length;
    const dispatched = transfers.filter((t) => t.status === StockTransferStatus.Dispatched).length;
    const received = transfers.filter((t) => t.status === StockTransferStatus.Received).length;
    const rejected = transfers.filter((t) => t.status === StockTransferStatus.Rejected).length;
    const cancelled = transfers.filter((t) => t.status === StockTransferStatus.Cancelled).length;

    return {
      total,
      draft,
      submitted,
      approved,
      dispatched,
      received,
      rejected,
      cancelled,
      inTransit: dispatched,
      completed: received,
    };
  }, [transfers]);

  // Form item totals
  const formTotals = useMemo(() => {
    const totalLines = lineItems.length;
    const totalUnits = lineItems.reduce((acc, l) => acc + (Number(l.requestedQuantity) || 0), 0);
    return { totalLines, totalUnits };
  }, [lineItems]);

  // Status Badge
  const renderStatusBadge = (status: StockTransferStatus) => {
    const badgeClass = STOCK_TRANSFER_STATUS_BADGE_CLASSES[status] || 'badge-secondary';
    const label = STOCK_TRANSFER_STATUS_LABELS[status] || 'Unknown';

    switch (status) {
      case StockTransferStatus.Draft:
        return <span className={`badge ${badgeClass}`}>{label}</span>;
      case StockTransferStatus.Submitted:
        return (
          <span className={`badge ${badgeClass}`} title="Submitted, awaiting supervisory approval">
            <Clock size={12} /> {label}
          </span>
        );
      case StockTransferStatus.Approved:
        return (
          <span className={`badge ${badgeClass}`} title="Approved, ready for physical warehouse dispatch">
            <CheckCircle size={12} /> {label}
          </span>
        );
      case StockTransferStatus.Dispatched:
        return (
          <span className={`badge ${badgeClass}`} title="Dispatched from source, currently in transit">
            <Truck size={12} /> {label}
          </span>
        );
      case StockTransferStatus.Received:
        return (
          <span className={`badge ${badgeClass}`} title="Received at destination store and verified">
            <CheckCircle size={12} /> {label}
          </span>
        );
      case StockTransferStatus.Rejected:
        return (
          <span className={`badge ${badgeClass}`} title="Transfer request rejected">
            <Ban size={12} /> {label}
          </span>
        );
      case StockTransferStatus.Cancelled:
        return <span className={`badge ${badgeClass}`}>{label}</span>;
      default:
        return <span className={`badge ${badgeClass}`}>{label}</span>;
    }
  };

  // Access check
  if (!canTransfer) {
    return (
      <div className="content-container">
        <div className="card text-center" style={{ padding: '3rem 1.5rem' }}>
          <Lock size={48} className="text-muted" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--navy-900)' }}>
            Access Restricted
          </h2>
          <p className="text-muted" style={{ maxWidth: 420, margin: '0.5rem auto 0' }}>
            You do not have permission to view or manage Inter-Store Transfers. Please contact your administrator.
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
            <Truck size={24} />
          </div>
          <div>
            <h1>Inter-Store Stock Transfers</h1>
            <p className="page-header-subtitle">
              Manage multi-stage stock transfers: Request, Approve, Dispatch from source, and Receive at destination warehouse.
            </p>
          </div>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadData}
            disabled={isLoading}
            title="Refresh transfers"
          >
            <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreateModal}
          >
            <Plus size={16} />
            <span>New Stock Transfer</span>
          </button>
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

      {/* Stats Cards */}
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
            Total Transfers
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--navy-900)' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            All historical requests
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Pending Approval
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: '#d97706' }}>
            {stats.submitted}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '0.25rem' }}>
            {stats.draft} Draft • {stats.submitted} Submitted
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Approved / To Dispatch
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--blue-600)' }}>
            {stats.approved}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--blue-600)', marginTop: '0.25rem' }}>
            Ready at source warehouse
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            In Transit (Dispatched)
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: '#7c3aed' }}>
            {stats.inTransit}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#7c3aed', marginTop: '0.25rem' }}>
            Awaiting receipt confirmation
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Completed
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--accent-emerald, #059669)' }}>
            {stats.completed}
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
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 400 }}>
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
              placeholder="Search Transfer #, Stores, Requester, Notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="trf-status-filter" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Status:
              </label>
              <select
                id="trf-status-filter"
                className="form-input"
                style={{ width: 'auto', paddingRight: '2rem' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses ({transfers.length})</option>
                <option value={StockTransferStatus.Draft}>Draft ({stats.draft})</option>
                <option value={StockTransferStatus.Submitted}>Submitted ({stats.submitted})</option>
                <option value={StockTransferStatus.Approved}>Approved ({stats.approved})</option>
                <option value={StockTransferStatus.Dispatched}>In Transit ({stats.inTransit})</option>
                <option value={StockTransferStatus.Received}>Received ({stats.completed})</option>
                <option value={StockTransferStatus.Rejected}>Rejected ({stats.rejected})</option>
                <option value={StockTransferStatus.Cancelled}>Cancelled ({stats.cancelled})</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="trf-store-filter" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Store:
              </label>
              <select
                id="trf-store-filter"
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

      {/* Transfers Data Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
            <RefreshCw size={28} className="spin text-primary" style={{ margin: '0 auto 0.75rem' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
              Loading inter-store transfers...
            </p>
          </div>
        ) : filteredTransfers.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
            <Truck size={48} className="text-muted" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--navy-900)' }}>
              No Stock Transfers Found
            </h3>
            <p className="text-muted" style={{ maxWidth: 460, margin: '0.5rem auto 1.25rem' }}>
              {searchQuery || statusFilter !== 'all' || storeFilter !== 'all'
                ? 'No stock transfers matched your filter criteria.'
                : 'No inter-store transfer orders have been generated yet. Use the New Stock Transfer button to initiate warehouse stock movement.'}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenCreateModal}
            >
              <Plus size={16} />
              <span>Create First Transfer</span>
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.875rem 1rem' }}>Transfer # / Date</th>
                  <th style={{ textAlign: 'left', padding: '0.875rem 1rem' }}>Origin &rarr; Destination</th>
                  <th style={{ textAlign: 'center', padding: '0.875rem 1rem' }}>Items / Units</th>
                  <th style={{ textAlign: 'left', padding: '0.875rem 1rem' }}>Requested By</th>
                  <th style={{ textAlign: 'center', padding: '0.875rem 1rem' }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '0.875rem 1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransfers.map((trf) => {
                  const totalUnits = trf.items.reduce(
                    (acc, i) => acc + Number(i.requestedQuantity),
                    0
                  );

                  return (
                    <tr key={trf.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      {/* Transfer # & Date */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>
                          {trf.transferNumber}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Calendar size={12} />
                          <span>{formatDate(trf.transferDate)}</span>
                        </div>
                      </td>

                      {/* Origin -> Destination */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, color: 'var(--navy-900)' }}>
                          <span>{trf.sourceStoreName}</span>
                          <ArrowRight size={14} className="text-muted" />
                          <span style={{ color: 'var(--blue-600)', fontWeight: 600 }}>
                            {trf.destinationStoreName}
                          </span>
                        </div>
                        {trf.notes && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            {trf.notes}
                          </div>
                        )}
                      </td>

                      {/* Items / Units */}
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                        <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>
                          {trf.items.length} {trf.items.length === 1 ? 'item' : 'items'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {totalUnits.toLocaleString()} total units
                        </div>
                      </td>

                      {/* Requested By */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ fontWeight: 500, color: 'var(--navy-900)' }}>
                          {trf.requestedBy || 'System / Unassigned'}
                        </div>
                        {trf.approvedBy && (
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                            Appr: {trf.approvedBy}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                        {renderStatusBadge(trf.status)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setViewingTransfer(trf)}
                            title="View transfer details"
                          >
                            <Eye size={14} />
                            <span>Details</span>
                          </button>

                          {/* Quick Workflow Actions */}
                          {trf.status === StockTransferStatus.Draft && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => setSubmitConfirmTransfer(trf)}
                              title="Submit transfer for approval"
                            >
                              <Send size={13} />
                              <span>Submit</span>
                            </button>
                          )}

                          {trf.status === StockTransferStatus.Submitted && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => {
                                setApproveConfirmTransfer(trf);
                                setApproverName(user?.fullName || 'Supervisor');
                              }}
                              title="Approve transfer"
                            >
                              <ThumbsUp size={13} />
                              <span>Approve</span>
                            </button>
                          )}

                          {trf.status === StockTransferStatus.Approved && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
                              onClick={() => setDispatchConfirmTransfer(trf)}
                              title="Dispatch transfer (deducts stock from source store)"
                            >
                              <Truck size={13} />
                              <span>Dispatch</span>
                            </button>
                          )}

                          {trf.status === StockTransferStatus.Dispatched && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                              onClick={() => setReceiveConfirmTransfer(trf)}
                              title="Receive transfer (adds stock to destination store)"
                            >
                              <CheckCircle size={13} />
                              <span>Receive</span>
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
      {/* CREATE STOCK TRANSFER MODAL                              */}
      {/* ======================================================== */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          if (!isActionLoading) setIsCreateModalOpen(false);
        }}
        size="lg"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Truck size={20} className="text-primary" />
            <span>New Inter-Store Stock Transfer</span>
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
              onClick={handleCreateTransfer}
              disabled={isActionLoading || activeStores.length < 2}
            >
              {isActionLoading ? (
                <>
                  <RefreshCw size={14} className="spin" />
                  <span>Creating Transfer...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>
                    Create Draft Transfer ({formTotals.totalLines} lines • {formTotals.totalUnits} units)
                  </span>
                </>
              )}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateTransfer}>
          {createValidationSummary && (
            <div className="alert alert-danger" style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
              <AlertCircle size={16} />
              <div>{createValidationSummary}</div>
            </div>
          )}

          {activeStores.length < 2 ? (
            <div className="alert alert-info">
              <AlertCircle size={18} />
              <div>
                <strong>At least two active stores are required</strong> to execute inter-store transfers.
              </div>
            </div>
          ) : (
            <>
              {/* Origin and Destination Stores */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1rem',
                }}
              >
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="create-src-store" className="form-label">
                    Origin Store (Dispatch) <span style={{ color: 'var(--accent-ruby)' }}>*</span>
                  </label>
                  <select
                    id="create-src-store"
                    className="form-input"
                    value={sourceStoreId}
                    onChange={(e) => setSourceStoreId(Number(e.target.value))}
                    required
                  >
                    <option value="" disabled>Select Source Store...</option>
                    {activeStores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="create-dest-store" className="form-label">
                    Destination Store (Receipt) <span style={{ color: 'var(--accent-ruby)' }}>*</span>
                  </label>
                  <select
                    id="create-dest-store"
                    className="form-input"
                    value={destinationStoreId}
                    onChange={(e) => setDestinationStoreId(Number(e.target.value))}
                    required
                  >
                    <option value="" disabled>Select Destination Store...</option>
                    {activeStores
                      .filter((s) => s.id !== Number(sourceStoreId))
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Requester and Notes */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1rem',
                }}
              >
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="create-requester" className="form-label">Requested By</label>
                  <input
                    id="create-requester"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Asif Munir"
                    maxLength={200}
                    value={requestedBy}
                    onChange={(e) => setRequestedBy(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="create-notes" className="form-label">Transfer Purpose / Notes</label>
                  <input
                    id="create-notes"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Replenishment for regional warehouse event..."
                    maxLength={1000}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Transfer Line Items Grid */}
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
                    Items to Transfer
                  </h4>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleAddLineItem}
                    style={{ fontSize: '0.75rem' }}
                  >
                    <Plus size={14} />
                    <span>Add Item</span>
                  </button>
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
                        <th style={{ textAlign: 'left', minWidth: 200 }}>Catalog Item SKU *</th>
                        <th style={{ textAlign: 'right', width: 110 }}>Avail at Source</th>
                        <th style={{ textAlign: 'center', width: 120 }}>Qty to Transfer *</th>
                        <th style={{ textAlign: 'left', minWidth: 160 }}>Line Notes</th>
                        <th style={{ width: 45, textAlign: 'center' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((line, idx) => {
                        const available = sourceStoreBalances.get(Number(line.itemId)) ?? 0;
                        const requested = Number(line.requestedQuantity) || 0;
                        const hasInsufficientStock = requested > available;

                        return (
                          <tr key={line.key} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '0.5rem' }}>
                              <select
                                className="form-input"
                                style={{ height: '2rem', padding: '0.2rem 0.5rem', fontSize: '0.8125rem' }}
                                value={line.itemId}
                                onChange={(e) => handleLineItemChange(idx, 'itemId', e.target.value)}
                                required
                              >
                                <option value="" disabled>Select Item SKU...</option>
                                {activeItems.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.itemCode} — {item.name}
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 600, color: available > 0 ? '#059669' : '#dc2626' }}>
                              {available.toLocaleString()}
                            </td>

                            <td style={{ padding: '0.5rem' }}>
                              <input
                                type="number"
                                step="any"
                                min={0.000001}
                                className="form-input"
                                style={{
                                  height: '2rem',
                                  padding: '0.2rem 0.5rem',
                                  fontSize: '0.8125rem',
                                  textAlign: 'right',
                                  borderColor: hasInsufficientStock ? '#ef4444' : undefined,
                                }}
                                value={line.requestedQuantity}
                                onChange={(e) =>
                                  handleLineItemChange(idx, 'requestedQuantity', e.target.value)
                                }
                                required
                              />
                              {hasInsufficientStock && (
                                <div style={{ fontSize: '0.6875rem', color: '#b91c1c', marginTop: '0.15rem', textAlign: 'right' }}>
                                  Exceeds available ({available})
                                </div>
                              )}
                            </td>

                            <td style={{ padding: '0.5rem' }}>
                              <input
                                type="text"
                                className="form-input"
                                style={{ height: '2rem', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                placeholder="Optional line remarks..."
                                maxLength={500}
                                value={line.notes}
                                onChange={(e) => handleLineItemChange(idx, 'notes', e.target.value)}
                              />
                            </td>

                            <td style={{ textAlign: 'center', padding: '0.5rem' }}>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ padding: '0.25rem', color: '#dc2626' }}
                                disabled={lineItems.length <= 1}
                                onClick={() => handleRemoveLineItem(idx)}
                                title="Remove item"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* VIEW STOCK TRANSFER DETAILS MODAL                        */}
      {/* ======================================================== */}
      {viewingTransfer && (
        <Modal
          isOpen={Boolean(viewingTransfer)}
          onClose={() => setViewingTransfer(null)}
          size="lg"
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
              <Truck size={20} className="text-primary" />
              <span>Stock Transfer Note — {viewingTransfer.transferNumber}</span>
              <div style={{ marginLeft: 'auto', marginRight: '1rem' }}>
                {renderStatusBadge(viewingTransfer.status)}
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
                  title="Print transfer gate pass and delivery voucher"
                >
                  <Printer size={14} />
                  <span>Print Gate Pass</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {/* Workflow Actions */}
                {viewingTransfer.status === StockTransferStatus.Draft && (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setEditNotesValue(viewingTransfer.notes || '');
                        setIsEditNotesModalOpen(true);
                      }}
                    >
                      <Edit2 size={13} />
                      <span>Edit Notes</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => setCancelConfirmTransfer(viewingTransfer)}
                      disabled={isActionLoading}
                    >
                      <Ban size={14} />
                      <span>Cancel</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setSubmitConfirmTransfer(viewingTransfer)}
                      disabled={isActionLoading}
                    >
                      <Send size={14} />
                      <span>Submit for Approval</span>
                    </button>
                  </>
                )}

                {viewingTransfer.status === StockTransferStatus.Submitted && (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => setRejectConfirmTransfer(viewingTransfer)}
                      disabled={isActionLoading}
                    >
                      <ThumbsDown size={14} />
                      <span>Reject</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => setCancelConfirmTransfer(viewingTransfer)}
                      disabled={isActionLoading}
                    >
                      <Ban size={14} />
                      <span>Cancel</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setApproveConfirmTransfer(viewingTransfer);
                        setApproverName(user?.fullName || 'Supervisor');
                      }}
                      disabled={isActionLoading}
                    >
                      <ThumbsUp size={14} />
                      <span>Approve Transfer</span>
                    </button>
                  </>
                )}

                {viewingTransfer.status === StockTransferStatus.Approved && (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => setCancelConfirmTransfer(viewingTransfer)}
                      disabled={isActionLoading}
                    >
                      <Ban size={14} />
                      <span>Cancel</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
                      onClick={() => setDispatchConfirmTransfer(viewingTransfer)}
                      disabled={isActionLoading}
                    >
                      <Truck size={14} />
                      <span>Dispatch from Source Store</span>
                    </button>
                  </>
                )}

                {viewingTransfer.status === StockTransferStatus.Dispatched && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                    onClick={() => setReceiveConfirmTransfer(viewingTransfer)}
                    disabled={isActionLoading}
                  >
                    <CheckCircle size={14} />
                    <span>Confirm Receipt at Destination</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setViewingTransfer(null)}
                >
                  Close
                </button>
              </div>
            </div>
          }
        >
          {/* Stepper Pipeline */}
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
            <div style={{ color: viewingTransfer.status >= StockTransferStatus.Draft ? 'var(--blue-600)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: viewingTransfer.status >= StockTransferStatus.Draft ? '#2563eb' : '#94a3b8', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                1
              </span>
              <span>Draft</span>
            </div>
            <ArrowRight size={14} className="text-muted" />

            <div style={{ color: viewingTransfer.status >= StockTransferStatus.Submitted ? 'var(--blue-600)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: viewingTransfer.status >= StockTransferStatus.Submitted ? '#2563eb' : '#94a3b8', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                2
              </span>
              <span>Submitted</span>
            </div>
            <ArrowRight size={14} className="text-muted" />

            <div style={{ color: viewingTransfer.status >= StockTransferStatus.Approved ? 'var(--blue-600)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: viewingTransfer.status >= StockTransferStatus.Approved ? '#2563eb' : '#94a3b8', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                3
              </span>
              <span>Approved</span>
            </div>
            <ArrowRight size={14} className="text-muted" />

            <div style={{ color: viewingTransfer.status >= StockTransferStatus.Dispatched ? '#7c3aed' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: viewingTransfer.status >= StockTransferStatus.Dispatched ? '#7c3aed' : '#94a3b8', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                4
              </span>
              <span>In Transit</span>
            </div>
            <ArrowRight size={14} className="text-muted" />

            <div style={{ color: viewingTransfer.status === StockTransferStatus.Received ? '#059669' : viewingTransfer.status === StockTransferStatus.Rejected ? '#dc2626' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: viewingTransfer.status === StockTransferStatus.Received ? '#059669' : viewingTransfer.status === StockTransferStatus.Rejected ? '#dc2626' : '#94a3b8', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                5
              </span>
              <span>Completed</span>
            </div>
          </div>

          {/* Transfer Metadata Grid */}
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
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Transfer Number</div>
              <strong style={{ color: 'var(--navy-900)', fontSize: '0.9375rem' }}>
                {viewingTransfer.transferNumber}
              </strong>
            </div>

            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Origin Store (Source)</div>
              <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>
                {viewingTransfer.sourceStoreName}
              </div>
            </div>

            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Destination Store</div>
              <div style={{ fontWeight: 600, color: 'var(--blue-600)' }}>
                {viewingTransfer.destinationStoreName}
              </div>
            </div>

            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Created / Transfer Date</div>
              <div style={{ fontWeight: 500, color: 'var(--navy-900)' }}>
                {formatDate(viewingTransfer.transferDate)}
              </div>
            </div>

            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Requested By</div>
              <div style={{ fontWeight: 500, color: 'var(--navy-900)' }}>
                {viewingTransfer.requestedBy || 'Unspecified'}
              </div>
            </div>

            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Approved By</div>
              <div style={{ fontWeight: 500, color: 'var(--navy-900)' }}>
                {viewingTransfer.approvedBy
                  ? `${viewingTransfer.approvedBy} (${viewingTransfer.approvedAt ? formatDate(viewingTransfer.approvedAt) : ''})`
                  : 'Pending'}
              </div>
            </div>

            {viewingTransfer.dispatchedAt && (
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Dispatched At</div>
                <div style={{ color: '#7c3aed', fontWeight: 500 }}>
                  {formatDateTime(viewingTransfer.dispatchedAt)}
                </div>
              </div>
            )}

            {viewingTransfer.receivedAt && (
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Received At</div>
                <div style={{ color: '#059669', fontWeight: 500 }}>
                  {formatDateTime(viewingTransfer.receivedAt)}
                </div>
              </div>
            )}
          </div>

          {viewingTransfer.notes && (
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
              <span style={{ fontWeight: 600, color: 'var(--navy-900)' }}>Transfer Notes: </span>
              <span style={{ color: 'var(--navy-700)' }}>{viewingTransfer.notes}</span>
            </div>
          )}

          {/* Line Items Table */}
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--navy-900)' }}>
              Transfer Items Manifest
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
                    <th style={{ textAlign: 'right', padding: '0.625rem 0.75rem' }}>Requested Qty</th>
                    <th style={{ textAlign: 'right', padding: '0.625rem 0.75rem' }}>Dispatched Qty</th>
                    <th style={{ textAlign: 'right', padding: '0.625rem 0.75rem' }}>Received Qty</th>
                    <th style={{ textAlign: 'left', padding: '0.625rem 0.75rem' }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingTransfer.items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.625rem 0.75rem', fontWeight: 500 }}>
                        <div>{item.itemName}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          SKU: <strong>{item.itemCode}</strong> • Item #{item.itemId}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.625rem 0.75rem', fontWeight: 600 }}>
                        {Number(item.requestedQuantity).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.625rem 0.75rem', color: Number(item.dispatchedQuantity) > 0 ? '#7c3aed' : 'var(--text-muted)', fontWeight: Number(item.dispatchedQuantity) > 0 ? 600 : 400 }}>
                        {Number(item.dispatchedQuantity).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.625rem 0.75rem', color: Number(item.receivedQuantity) > 0 ? '#059669' : 'var(--text-muted)', fontWeight: Number(item.receivedQuantity) > 0 ? 600 : 400 }}>
                        {Number(item.receivedQuantity).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.625rem 0.75rem', color: 'var(--navy-700)' }}>
                        {item.notes || '—'}
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
      {/* EDIT NOTES MODAL (Draft only)                           */}
      {/* ======================================================== */}
      <Modal
        isOpen={isEditNotesModalOpen}
        onClose={() => setIsEditNotesModalOpen(false)}
        size="sm"
        title="Edit Transfer Notes"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsEditNotesModalOpen(false)}
              disabled={isActionLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveNotes}
              disabled={isActionLoading}
            >
              {isActionLoading ? 'Saving...' : 'Save Notes'}
            </button>
          </>
        }
      >
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="edit-notes-input" className="form-label">Transfer Purpose &amp; Remarks</label>
          <textarea
            id="edit-notes-input"
            className="form-input"
            rows={4}
            maxLength={1000}
            value={editNotesValue}
            onChange={(e) => setEditNotesValue(e.target.value)}
            placeholder="Consignment purpose, vehicle details, driver notes..."
          />
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* WORKFLOW CONFIRMATION DIALOGS                            */}
      {/* ======================================================== */}

      {/* Submit Confirmation */}
      {submitConfirmTransfer && (
        <ConfirmDialog
          isOpen={Boolean(submitConfirmTransfer)}
          onClose={() => setSubmitConfirmTransfer(null)}
          onConfirm={handleSubmitTransfer}
          title="Submit Stock Transfer"
          message={`Submit Transfer "${submitConfirmTransfer.transferNumber}" from ${submitConfirmTransfer.sourceStoreName} to ${submitConfirmTransfer.destinationStoreName} for supervisor approval?`}
          confirmLabel="Submit Transfer"
          variant="warning"
          isLoading={isActionLoading}
        />
      )}

      {/* Approve Modal Dialog */}
      {approveConfirmTransfer && (
        <Modal
          isOpen={Boolean(approveConfirmTransfer)}
          onClose={() => setApproveConfirmTransfer(null)}
          size="sm"
          title="Approve Stock Transfer"
          footer={
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setApproveConfirmTransfer(null)}
                disabled={isActionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleApproveTransfer}
                disabled={isActionLoading || !approverName.trim()}
              >
                {isActionLoading ? 'Approving...' : 'Confirm Approval'}
              </button>
            </>
          }
        >
          <p style={{ fontSize: '0.875rem', color: 'var(--navy-800)', lineHeight: 1.5, marginBottom: '1rem' }}>
            Approve stock transfer <strong>"{approveConfirmTransfer.transferNumber}"</strong>. Once approved, the origin
            warehouse ({approveConfirmTransfer.sourceStoreName}) is authorized to dispatch the items.
          </p>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="approver-name-input" className="form-label">
              Approver Name / Title <span style={{ color: 'var(--accent-ruby)' }}>*</span>
            </label>
            <input
              id="approver-name-input"
              type="text"
              className="form-input"
              maxLength={200}
              value={approverName}
              onChange={(e) => setApproverName(e.target.value)}
              required
            />
          </div>
        </Modal>
      )}

      {/* Reject Confirmation */}
      {rejectConfirmTransfer && (
        <ConfirmDialog
          isOpen={Boolean(rejectConfirmTransfer)}
          onClose={() => setRejectConfirmTransfer(null)}
          onConfirm={handleRejectTransfer}
          title="Reject Stock Transfer"
          message={`Are you sure you want to reject Stock Transfer "${rejectConfirmTransfer.transferNumber}"? The transfer will not proceed and cannot be dispatched.`}
          confirmLabel="Reject Transfer"
          variant="danger"
          isLoading={isActionLoading}
        />
      )}

      {/* Dispatch Confirmation (Physical Stock deduction warning) */}
      {dispatchConfirmTransfer && (
        <ConfirmDialog
          isOpen={Boolean(dispatchConfirmTransfer)}
          onClose={() => setDispatchConfirmTransfer(null)}
          onConfirm={handleDispatchTransfer}
          title="Dispatch Stock Transfer"
          message={`WARNING: Dispatching transfer "${dispatchConfirmTransfer.transferNumber}" will immediately deduct requested inventory quantities from "${dispatchConfirmTransfer.sourceStoreName}" and record immutable TransferOut stock movement entries. Ensure items are physically loaded and verified. Proceed with dispatch?`}
          confirmLabel="Confirm &amp; Dispatch Stock"
          variant="warning"
          isLoading={isActionLoading}
        />
      )}

      {/* Receive Confirmation (Physical Stock addition warning) */}
      {receiveConfirmTransfer && (
        <ConfirmDialog
          isOpen={Boolean(receiveConfirmTransfer)}
          onClose={() => setReceiveConfirmTransfer(null)}
          onConfirm={handleReceiveTransfer}
          title="Receive Stock at Destination Warehouse"
          message={`Confirm receipt of transfer "${receiveConfirmTransfer.transferNumber}" at destination store "${receiveConfirmTransfer.destinationStoreName}"? This will credit stock balances into "${receiveConfirmTransfer.destinationStoreName}" and record immutable TransferIn stock movement entries. Proceed?`}
          confirmLabel="Confirm Receipt"
          variant="success"
          isLoading={isActionLoading}
        />
      )}

      {/* Cancel Confirmation */}
      {cancelConfirmTransfer && (
        <ConfirmDialog
          isOpen={Boolean(cancelConfirmTransfer)}
          onClose={() => setCancelConfirmTransfer(null)}
          onConfirm={handleCancelTransfer}
          title="Cancel Stock Transfer"
          message={`Are you sure you want to cancel Stock Transfer "${cancelConfirmTransfer.transferNumber}"? Once cancelled, this transfer order cannot be submitted or dispatched.`}
          confirmLabel="Cancel Transfer"
          variant="danger"
          isLoading={isActionLoading}
        />
      )}
    </div>
  );
};
