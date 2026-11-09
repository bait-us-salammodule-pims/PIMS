import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Plus,
  RefreshCw,
  Search,
  Eye,
  CheckCircle,
  AlertCircle,
  Send,
  Calendar,
  Clock,
  Ban,
  Lock,
  Scale,
  Award,
  FileCheck,
  Edit2,
} from 'lucide-react';
import { procurementService } from '../../api/procurementService';
import { vendorService } from '../../api/vendorService';
import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  QuotationStatus,
  QUOTATION_STATUS_LABELS,
  PurchaseRequestStatus,
  type QuotationRequestResponse,
  type CreateQuotationRequestDto,
  type UpdateQuotationRequestDto,
  type CreateVendorQuotationDto,
  type PurchaseRequestResponse,
  type QuotationComparisonItemDto,
} from '../../types/procurement';
import { VendorApprovalStatus, type Vendor } from '../../types/vendor';

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

export const QuotationsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canView = hasPermission('QuotationView');
  const canCreate = hasPermission('QuotationCreate');
  const canUpdate = hasPermission('QuotationUpdate');
  const canCompare = hasPermission('QuotationComparisonView') || hasPermission('QuotationView');
  const canAward = hasPermission('QuotationComparisonApprove') || hasPermission('QuotationUpdate');

  // Pre-selected PR from URL query param if initiated from PurchaseRequestsPage
  const createPrIdParam = searchParams.get('createPrId');

  // State
  const [quotations, setQuotations] = useState<QuotationRequestResponse[]>([]);
  const [approvedPrs, setApprovedPrs] = useState<PurchaseRequestResponse[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [viewingQuotation, setViewingQuotation] = useState<QuotationRequestResponse | null>(null);
  const [editingQuotation, setEditingQuotation] = useState<QuotationRequestResponse | null>(null);
  const [comparisonRfq, setComparisonRfq] = useState<QuotationRequestResponse | null>(null);
  const [comparisonItems, setComparisonItems] = useState<QuotationComparisonItemDto[]>([]);
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);

  // Vendor Quotation Submission Modal State
  const [bidModalRfq, setBidModalRfq] = useState<QuotationRequestResponse | null>(null);
  const [bidPrDetails, setBidPrDetails] = useState<PurchaseRequestResponse | null>(null);
  const [bidForm, setBidForm] = useState<{
    vendorId: number | '';
    vendorQuotationNumber: string;
    submittedAt: string;
    validUntil: string;
    notes: string;
    items: Array<{
      purchaseRequestItemId: number;
      itemCode: string;
      itemName: string;
      quantity: number;
      unitPrice: number | '';
      taxPercentage: number;
      remarks: string;
    }>;
  }>({
    vendorId: '',
    vendorQuotationNumber: '',
    submittedAt: getTodayIso(),
    validUntil: getTodayIso(),
    notes: '',
    items: [],
  });

  // Action Confirmation Dialogs
  const [sendToVendorsConfirm, setSendToVendorsConfirm] = useState<QuotationRequestResponse | null>(null);
  const [responsesReceivedConfirm, setResponsesReceivedConfirm] = useState<QuotationRequestResponse | null>(null);
  const [startComparisonConfirm, setStartComparisonConfirm] = useState<QuotationRequestResponse | null>(null);
  const [selectVendorConfirm, setSelectVendorConfirm] = useState<{
    rfq: QuotationRequestResponse;
    quotationId: number;
    vendorName: string;
    amount: number;
  } | null>(null);
  const [cancelRfqConfirm, setCancelRfqConfirm] = useState<QuotationRequestResponse | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Create RFQ Form
  const [createForm, setCreateForm] = useState<{
    quotationNumber: string;
    purchaseRequestId: number | '';
    closingDate: string;
    notes: string;
  }>({
    quotationNumber: '',
    purchaseRequestId: '',
    closingDate: getTodayIso(),
    notes: '',
  });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  // Edit RFQ Form
  const [editForm, setEditForm] = useState<{
    closingDate: string;
    notes: string;
  }>({
    closingDate: getTodayIso(),
    notes: '',
  });

  // Load Data
  const loadData = useCallback(async () => {
    if (!canView) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [rfqs, prs, vendorList] = await Promise.all([
        procurementService.getQuotations(),
        procurementService.getPurchaseRequests(),
        vendorService.getVendors(),
      ]);
      setQuotations(rfqs);
      setApprovedPrs(prs.filter((p) => p.status === PurchaseRequestStatus.Approved));
      setVendors(vendorList.filter((v) => v.isActive && v.approvalStatus === VendorApprovalStatus.Approved));
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to load quotation requests.'));
    } finally {
      setIsLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // If query param createPrId is passed, open create modal automatically
  useEffect(() => {
    if (!createPrIdParam || approvedPrs.length === 0) return;

    const targetPr = approvedPrs.find(
      (p) => p.id === Number(createPrIdParam)
    );

    if (!targetPr) return;

    const defaultNum = `RFQ-${new Date().getFullYear()}-${String(
      quotations.length + 1
    ).padStart(4, '0')}`;

    setCreateForm({
      quotationNumber: defaultNum,
      purchaseRequestId: targetPr.id,
      closingDate: getTodayIso(),
      notes: `RFQ issued for approved Purchase Request ${targetPr.requestNumber}`,
    });

    setIsCreateModalOpen(true);

    const updatedParams = new URLSearchParams(searchParams);
    updatedParams.delete('createPrId');
    setSearchParams(updatedParams, { replace: true });

  }, [
    createPrIdParam,
    approvedPrs,
    quotations.length,
    searchParams,
    setSearchParams,
  ]);
  // Filtered RFQs
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      if (statusFilter !== 'all') {
        if (q.status !== Number(statusFilter)) return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesNum = q.quotationNumber.toLowerCase().includes(query);
        const matchesPr = q.purchaseRequestNumber.toLowerCase().includes(query);
        const matchesNotes = q.notes?.toLowerCase().includes(query) ?? false;
        const matchesVendors = q.vendorQuotations?.some((vq) =>
          vq.vendorName.toLowerCase().includes(query)
        );
        return matchesNum || matchesPr || matchesNotes || matchesVendors;
      }

      return true;
    });
  }, [quotations, statusFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = quotations.length;
    const draft = quotations.filter((q) => q.status === QuotationStatus.Draft).length;
    const active = quotations.filter(
      (q) =>
        q.status === QuotationStatus.SentToVendors ||
        q.status === QuotationStatus.ResponsesReceived ||
        q.status === QuotationStatus.UnderComparison
    ).length;
    const awarded = quotations.filter((q) => q.status === QuotationStatus.Awarded).length;
    const cancelled = quotations.filter((q) => q.status === QuotationStatus.Cancelled).length;
    return { total, draft, active, awarded, cancelled };
  }, [quotations]);

  // Item-by-item comparison matrix derived from vendor quotations
  const itemPriceMatrix = useMemo(() => {
    if (!comparisonRfq || !comparisonRfq.vendorQuotations || comparisonRfq.vendorQuotations.length === 0) {
      return [];
    }

    const itemMap = new Map<
      number,
      {
        purchaseRequestItemId: number;
        itemCode: string;
        itemName: string;
        quantity: number;
        vendorOffers: Array<{
          vendorId: number;
          vendorName: string;
          unitPrice: number;
          taxPercentage: number;
          isLowestPrice: boolean;
        }>;
      }
    >();

    for (const vq of comparisonRfq.vendorQuotations) {
      for (const it of vq.items || []) {
        if (!itemMap.has(it.purchaseRequestItemId)) {
          itemMap.set(it.purchaseRequestItemId, {
            purchaseRequestItemId: it.purchaseRequestItemId,
            itemCode: it.itemCode,
            itemName: it.itemName,
            quantity: it.quantity,
            vendorOffers: [],
          });
        }
        itemMap.get(it.purchaseRequestItemId)!.vendorOffers.push({
          vendorId: vq.vendorId,
          vendorName: vq.vendorName,
          unitPrice: it.unitPrice,
          taxPercentage: it.taxPercentage,
          isLowestPrice: false,
        });
      }
    }

    const rows = Array.from(itemMap.values());
    for (const row of rows) {
      if (row.vendorOffers.length > 0) {
        const minPrice = Math.min(...row.vendorOffers.map((o) => o.unitPrice));
        for (const offer of row.vendorOffers) {
          if (offer.unitPrice === minPrice && minPrice > 0) {
            offer.isLowestPrice = true;
          }
        }
      }
    }

    return rows;
  }, [comparisonRfq]);

  // Status Badge Helper
  const renderStatusBadge = (status: QuotationStatus) => {
    switch (status) {
      case QuotationStatus.Draft:
        return <span className="badge badge-secondary">Draft</span>;
      case QuotationStatus.SentToVendors:
        return (
          <span className="badge badge-cyan" title="Sent to suppliers for bidding">
            <Send size={12} /> Sent to Vendors
          </span>
        );
      case QuotationStatus.ResponsesReceived:
        return (
          <span className="badge badge-warning" title="Bids received, ready for evaluation">
            <Clock size={12} /> Responses Received
          </span>
        );
      case QuotationStatus.UnderComparison:
        return (
          <span className="badge badge-purple" title="Bid comparison in progress">
            <Scale size={12} /> Under Comparison
          </span>
        );
      case QuotationStatus.Awarded:
        return (
          <span className="badge badge-success" title="Winning vendor bid awarded">
            <Award size={12} /> Awarded
          </span>
        );
      case QuotationStatus.Cancelled:
        return <span className="badge badge-secondary">Cancelled</span>;
      default:
        return <span className="badge badge-secondary">Unknown</span>;
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    const defaultNum = `RFQ-${new Date().getFullYear()}-${String(quotations.length + 1).padStart(4, '0')}`;
    const firstApproved = approvedPrs[0];
    setCreateForm({
      quotationNumber: defaultNum,
      purchaseRequestId: firstApproved ? firstApproved.id : '',
      closingDate: getTodayIso(),
      notes: '',
    });
    setCreateErrors({});
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!createForm.quotationNumber.trim()) errors.quotationNumber = 'Quotation / RFQ number is required.';
    if (!createForm.purchaseRequestId) errors.purchaseRequestId = 'Approved Purchase Request is required.';
    if (!createForm.closingDate) errors.closingDate = 'Closing date is required.';

    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      return;
    }

    setIsActionLoading(true);
    setErrorMessage(null);

    const payload: CreateQuotationRequestDto = {
      quotationNumber: createForm.quotationNumber.trim().toUpperCase(),
      purchaseRequestId: Number(createForm.purchaseRequestId),
      closingDate: new Date(createForm.closingDate).toISOString(),
      notes: createForm.notes.trim() || null,
    };

    try {
      const created = await procurementService.createQuotation(payload);
      setSuccessMessage(`Quotation Request "${created.quotationNumber}" created successfully.`);
      setIsCreateModalOpen(false);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to create quotation request.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (rfq: QuotationRequestResponse) => {
    setEditingQuotation(rfq);
    setEditForm({
      closingDate: rfq.closingDate.split('T')[0],
      notes: rfq.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuotation) return;

    setIsActionLoading(true);
    setErrorMessage(null);

    const payload: UpdateQuotationRequestDto = {
      closingDate: new Date(editForm.closingDate).toISOString(),
      notes: editForm.notes.trim() || null,
    };

    try {
      await procurementService.updateQuotation(editingQuotation.id, payload);
      setSuccessMessage(`Quotation Request "${editingQuotation.quotationNumber}" updated.`);
      setIsEditModalOpen(false);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to update quotation request.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Open Bid Submission Modal
  const handleOpenAddBid = async (rfq: QuotationRequestResponse) => {
    setBidModalRfq(rfq);
    setIsActionLoading(true);
    try {
      // Fetch full PR to get item details
      const pr = await procurementService.getPurchaseRequestById(rfq.purchaseRequestId);
      setBidPrDetails(pr);

      const firstVendor = vendors.find(
        (v) => !rfq.vendorQuotations.some((vq) => vq.vendorId === v.id)
      );

      const itemsDraft = pr.items.map((item) => ({
        purchaseRequestItemId: item.id,
        itemCode: item.itemCode,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: '' as const,
        taxPercentage: 0,
        remarks: '',
      }));

      const defaultQuoteNum = `VQ-${rfq.quotationNumber}-${String(rfq.vendorQuotations.length + 1).padStart(2, '0')}`;

      setBidForm({
        vendorId: firstVendor ? firstVendor.id : '',
        vendorQuotationNumber: defaultQuoteNum,
        submittedAt: getTodayIso(),
        validUntil: getTodayIso(),
        notes: '',
        items: itemsDraft,
      });
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to prepare vendor quotation form.'));
      setBidModalRfq(null);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bidModalRfq) return;

    if (!bidForm.vendorId) {
      alert('Please select a supplier.');
      return;
    }
    if (!bidForm.vendorQuotationNumber.trim()) {
      alert('Supplier quotation number is required.');
      return;
    }

    for (let i = 0; i < bidForm.items.length; i++) {
      const it = bidForm.items[i];
      if (it.unitPrice === '' || Number(it.unitPrice) <= 0) {
        alert(`Please enter a valid unit price for item "${it.itemName}".`);
        return;
      }
    }

    setIsActionLoading(true);
    setErrorMessage(null);

    const payload: CreateVendorQuotationDto = {
      vendorId: Number(bidForm.vendorId),
      vendorQuotationNumber: bidForm.vendorQuotationNumber.trim(),
      submittedAt: new Date(bidForm.submittedAt).toISOString(),
      validUntil: new Date(bidForm.validUntil).toISOString(),
      notes: bidForm.notes.trim() || null,
      items: bidForm.items.map((it) => ({
        purchaseRequestItemId: it.purchaseRequestItemId,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        taxPercentage: Number(it.taxPercentage || 0),
        remarks: it.remarks.trim() || null,
      })),
    };

    try {
      await procurementService.addVendorQuotation(bidModalRfq.id, payload);
      setSuccessMessage(`Supplier quotation recorded successfully for ${bidModalRfq.quotationNumber}.`);
      setBidModalRfq(null);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to record vendor quotation.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Open Comparison Modal
  const handleOpenComparison = async (rfq: QuotationRequestResponse) => {
    setComparisonRfq(rfq);
    setIsLoadingComparison(true);
    try {
      const items = await procurementService.getComparison(rfq.id);
      setComparisonItems(items);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to load comparison data.'));
    } finally {
      setIsLoadingComparison(false);
    }
  };

  // Status Lifecycle Actions
  const handleSendToVendors = async () => {
    if (!sendToVendorsConfirm) return;
    setIsActionLoading(true);
    try {
      await procurementService.sendQuotationToVendors(sendToVendorsConfirm.id);
      setSuccessMessage(`Quotation Request "${sendToVendorsConfirm.quotationNumber}" sent to vendors.`);
      setSendToVendorsConfirm(null);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to send RFQ to vendors.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResponsesReceived = async () => {
    if (!responsesReceivedConfirm) return;
    setIsActionLoading(true);
    try {
      await procurementService.markResponsesReceived(responsesReceivedConfirm.id);
      setSuccessMessage(`Quotation Request "${responsesReceivedConfirm.quotationNumber}" marked as Responses Received.`);
      setResponsesReceivedConfirm(null);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to advance RFQ state.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStartComparison = async () => {
    if (!startComparisonConfirm) return;
    setIsActionLoading(true);
    try {
      await procurementService.startComparison(startComparisonConfirm.id);
      setSuccessMessage(`Quotation Request "${startComparisonConfirm.quotationNumber}" is now Under Comparison.`);
      setStartComparisonConfirm(null);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to start comparison.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSelectVendorQuotation = async () => {
    if (!selectVendorConfirm) return;
    setIsActionLoading(true);
    try {
      await procurementService.selectVendorQuotation(
        selectVendorConfirm.rfq.id,
        selectVendorConfirm.quotationId
      );
      setSuccessMessage(`Vendor bid awarded to "${selectVendorConfirm.vendorName}".`);
      setSelectVendorConfirm(null);
      setComparisonRfq(null);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to award vendor quotation.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancelRfq = async () => {
    if (!cancelRfqConfirm) return;
    setIsActionLoading(true);
    try {
      await procurementService.cancelQuotation(cancelRfqConfirm.id);
      setSuccessMessage(`Quotation Request "${cancelRfqConfirm.quotationNumber}" cancelled.`);
      setCancelRfqConfirm(null);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to cancel quotation request.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  if (!canView) {
    return (
      <div className="content-container">
        <div className="card text-center" style={{ padding: '3rem 1.5rem' }}>
          <Lock size={48} className="text-muted" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--navy-900)' }}>
            Access Restricted
          </h2>
          <p className="text-muted" style={{ maxWidth: 420, margin: '0.5rem auto 0' }}>
            You do not have permission to view Quotations &amp; RFQs.
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
            <ShoppingCart size={24} />
          </div>
          <div>
            <h1>Quotations &amp; RFQs</h1>
            <p className="page-header-subtitle">
              Issue Requests for Quotation (RFQs), record supplier bids, compare proposals, and award orders.
            </p>
          </div>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadData}
            disabled={isLoading}
            title="Refresh quotations"
          >
            <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          {canCreate && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenCreate}
            >
              <Plus size={16} />
              <span>Issue New RFQ</span>
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
            Total RFQs
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--navy-900)' }}>
            {stats.total}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Draft RFQs
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--navy-600)' }}>
            {stats.draft}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Active / In Evaluation
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: '#b45309' }}>
            {stats.active}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Awarded Contracts
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
            {stats.awarded}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Cancelled
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--accent-rose)' }}>
            {stats.cancelled}
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
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.25rem' }}
              placeholder="Search RFQ #, PR #, supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label htmlFor="rfq-status-filter" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Status:
            </label>
            <select
              id="rfq-status-filter"
              className="form-select"
              style={{ width: 'auto', minWidth: '160px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              {Object.entries(QUOTATION_STATUS_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Quotations Table */}
      <div className="card table-container">
        {isLoading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <RefreshCw size={32} className="spin text-muted" style={{ margin: '0 auto 1rem' }} />
            <p className="text-muted">Loading quotations and RFQs...</p>
          </div>
        ) : filteredQuotations.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <ShoppingCart size={44} className="text-muted" style={{ margin: '0 auto 1rem', opacity: 0.6 }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--navy-900)' }}>
              No Quotations Found
            </h3>
            <p className="text-muted" style={{ maxWidth: 420, margin: '0.5rem auto 1.25rem' }}>
              {searchQuery || statusFilter !== 'all'
                ? 'No quotations match your search criteria.'
                : 'No quotation requests have been issued yet. Ensure an approved Purchase Request exists to issue an RFQ.'}
            </p>
            {canCreate && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenCreate}
              >
                <Plus size={16} />
                <span>Issue New RFQ</span>
              </button>
            )}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>RFQ #</th>
                <th>Linked PR</th>
                <th>Closing Date</th>
                <th style={{ textAlign: 'center' }}>Vendor Bids</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'right', width: '240px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotations.map((rfq) => {
                const awardedBid = rfq.vendorQuotations?.find((vq) => vq.isSelected);
                return (
                  <tr key={rfq.id}>
                    <td>
                      <span className="code-badge">{rfq.quotationNumber}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>
                        {rfq.purchaseRequestNumber}
                      </div>
                      {rfq.notes && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {rfq.notes}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem' }}>
                        <Calendar size={13} className="text-muted" />
                        <span>{formatDate(rfq.closingDate)}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge badge-secondary">
                        {rfq.vendorQuotations?.length || 0} Offers
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {renderStatusBadge(rfq.status)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        {/* View Details */}
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          title="View RFQ and Bids"
                          onClick={() => setViewingQuotation(rfq)}
                        >
                          <Eye size={15} />
                        </button>

                        {/* Edit Draft RFQ */}
                        {canUpdate && rfq.status === QuotationStatus.Draft && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            title="Edit RFQ"
                            onClick={() => handleOpenEdit(rfq)}
                          >
                            <Edit2 size={15} />
                          </button>
                        )}

                        {/* Send To Vendors (Draft only) */}
                        {canUpdate && rfq.status === QuotationStatus.Draft && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--blue-600)' }}
                            title="Send RFQ to Suppliers"
                            onClick={() => setSendToVendorsConfirm(rfq)}
                          >
                            <Send size={15} />
                          </button>
                        )}

                        {/* Record Vendor Quotation (SentToVendors only) */}
                        {canUpdate && rfq.status === QuotationStatus.SentToVendors && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--accent-emerald)' }}
                            title="Add Supplier Quotation"
                            onClick={() => handleOpenAddBid(rfq)}
                          >
                            <Plus size={15} />
                          </button>
                        )}

                        {/* Mark Responses Received (SentToVendors with bids) */}
                        {canUpdate &&
                          rfq.status === QuotationStatus.SentToVendors &&
                          rfq.vendorQuotations?.length > 0 && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              style={{ color: '#b45309' }}
                              title="Close Bidding &amp; Mark Responses Received"
                              onClick={() => setResponsesReceivedConfirm(rfq)}
                            >
                              <FileCheck size={15} />
                            </button>
                          )}

                        {/* Start Comparison (ResponsesReceived) */}
                        {canUpdate && rfq.status === QuotationStatus.ResponsesReceived && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--accent-purple)' }}
                            title="Start Bid Comparison"
                            onClick={() => setStartComparisonConfirm(rfq)}
                          >
                            <Scale size={15} />
                          </button>
                        )}

                        {/* View Comparison / Awarding (UnderComparison or with bids) */}
                        {canCompare &&
                          (rfq.status === QuotationStatus.UnderComparison ||
                            rfq.status === QuotationStatus.Awarded ||
                            rfq.vendorQuotations?.length > 0) && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--accent-purple)' }}
                              title="Compare Supplier Offers"
                              onClick={() => handleOpenComparison(rfq)}
                            >
                              <Scale size={15} />
                            </button>
                          )}

                        {/* Generate PO shortcut (Awarded only) */}
                        {rfq.status === QuotationStatus.Awarded && awardedBid && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--accent-emerald)' }}
                            title="Generate Purchase Order"
                            onClick={() =>
                              navigate(
                                `/procurement/orders?createRfqId=${rfq.id}&vendorQuotationId=${awardedBid.id}`
                              )
                            }
                          >
                            <FileCheck size={15} />
                          </button>
                        )}

                        {/* Cancel RFQ */}
                        {canUpdate &&
                          rfq.status !== QuotationStatus.Awarded &&
                          rfq.status !== QuotationStatus.Cancelled && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--accent-rose)' }}
                              title="Cancel RFQ"
                              onClick={() => setCancelRfqConfirm(rfq)}
                            >
                              <Ban size={15} />
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* =========================================================================
          Create Quotation Request (RFQ) Modal
          ========================================================================= */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        size="md"
        title="Issue Request for Quotation (RFQ)"
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
              onClick={handleCreateSubmit}
              disabled={isActionLoading}
            >
              {isActionLoading ? 'Creating...' : 'Create Draft RFQ'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* RFQ Number */}
            <div>
              <label htmlFor="rfq-create-num" className="form-label required">RFQ Number</label>
              <input
                id="rfq-create-num"
                type="text"
                className={`form-input ${createErrors.quotationNumber ? 'border-danger' : ''}`}
                value={createForm.quotationNumber}
                onChange={(e) => setCreateForm({ ...createForm, quotationNumber: e.target.value })}
                required
              />
              {createErrors.quotationNumber && (
                <div className="form-error">{createErrors.quotationNumber}</div>
              )}
            </div>

            {/* Purchase Request Selection */}
            <div>
              <label htmlFor="rfq-create-pr" className="form-label required">Linked Purchase Request (Approved Only)</label>
              {approvedPrs.length === 0 ? (
                <div className="alert alert-warning" style={{ fontSize: '0.8125rem' }}>
                  No approved Purchase Requests currently exist. Only approved PRs can be quoted.
                </div>
              ) : (
                <select
                  id="rfq-create-pr"
                  className={`form-select ${createErrors.purchaseRequestId ? 'border-danger' : ''}`}
                  value={createForm.purchaseRequestId ? String(createForm.purchaseRequestId) : ''}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      purchaseRequestId: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                  required
                >
                  <option value="">Select Approved Requisition</option>
                  {approvedPrs.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      [{pr.requestNumber}] {pr.departmentName} ({pr.items?.length || 0} items)
                    </option>
                  ))}
                </select>
              )}
              {createErrors.purchaseRequestId && (
                <div className="form-error">{createErrors.purchaseRequestId}</div>
              )}
            </div>

            {/* Closing Date */}
            <div>
              <label htmlFor="rfq-create-closing" className="form-label required">Quotation Bidding Deadline (Closing Date)</label>
              <input
                id="rfq-create-closing"
                type="date"
                className={`form-input ${createErrors.closingDate ? 'border-danger' : ''}`}
                value={createForm.closingDate}
                onChange={(e) => setCreateForm({ ...createForm, closingDate: e.target.value })}
                required
              />
              {createErrors.closingDate && (
                <div className="form-error">{createErrors.closingDate}</div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="rfq-create-notes" className="form-label">Procurement Instructions / Scope Notes</label>
              <textarea
                id="rfq-create-notes"
                className="form-textarea"
                rows={3}
                placeholder="Instructions to bidding vendors, delivery requirements, payment conditions..."
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          Edit RFQ Modal
          ========================================================================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editingQuotation ? `Edit RFQ: ${editingQuotation.quotationNumber}` : 'Edit RFQ'}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isActionLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleEditSubmit}
              disabled={isActionLoading}
            >
              {isActionLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <form onSubmit={handleEditSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label htmlFor="rfq-edit-closing" className="form-label required">Bidding Deadline (Closing Date)</label>
              <input
                id="rfq-edit-closing"
                type="date"
                className="form-input"
                value={editForm.closingDate}
                onChange={(e) => setEditForm({ ...editForm, closingDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="rfq-edit-notes" className="form-label">Procurement Instructions / Scope Notes</label>
              <textarea
                id="rfq-edit-notes"
                className="form-textarea"
                rows={3}
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          Add Vendor Quotation / Bid Modal
          ========================================================================= */}
      <Modal
        isOpen={!!bidModalRfq}
        onClose={() => setBidModalRfq(null)}
        size="lg"
        title={bidModalRfq ? `Record Supplier Offer: ${bidModalRfq.quotationNumber}` : 'Record Bid'}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setBidModalRfq(null)}
              disabled={isActionLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleBidSubmit}
              disabled={isActionLoading}
            >
              {isActionLoading ? 'Saving Offer...' : 'Save Supplier Offer'}
            </button>
          </>
        }
      >
        {bidModalRfq && (
          <form onSubmit={handleBidSubmit} noValidate>
            {bidPrDetails && (
              <div
                style={{
                  marginBottom: '1rem',
                  padding: '0.75rem 1rem',
                  background: 'var(--slate-50)',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  gap: '1.5rem',
                  color: 'var(--slate-700)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div><strong>Requisition:</strong> {bidPrDetails.requestNumber}</div>
                <div><strong>Department:</strong> {bidPrDetails.departmentName}</div>
                <div><strong>Required Date:</strong> {formatDate(bidPrDetails.requiredDate)}</div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              {/* Supplier Selection */}
              <div>
                <label htmlFor="bid-vendor-select" className="form-label required">Bidding Supplier</label>
                <select
                  id="bid-vendor-select"
                  className="form-select"
                  value={bidForm.vendorId ? String(bidForm.vendorId) : ''}
                  onChange={(e) =>
                    setBidForm({
                      ...bidForm,
                      vendorId: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                  required
                >
                  <option value="">Select Supplier</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      [{v.code}] {v.name}
                    </option>
                  ))}
                </select>
                <div className="form-hint">Only approved and active vendors can submit bids.</div>
              </div>

              {/* Vendor Quotation Number */}
              <div>
                <label htmlFor="bid-quote-num" className="form-label required">Supplier Quotation / Ref #</label>
                <input
                  id="bid-quote-num"
                  type="text"
                  className="form-input"
                  value={bidForm.vendorQuotationNumber}
                  onChange={(e) => setBidForm({ ...bidForm, vendorQuotationNumber: e.target.value })}
                  required
                />
              </div>

              {/* Submitted At */}
              <div>
                <label htmlFor="bid-sub-date" className="form-label required">Quotation Date</label>
                <input
                  id="bid-sub-date"
                  type="date"
                  className="form-input"
                  value={bidForm.submittedAt}
                  onChange={(e) => setBidForm({ ...bidForm, submittedAt: e.target.value })}
                  required
                />
              </div>

              {/* Valid Until */}
              <div>
                <label htmlFor="bid-valid-date" className="form-label required">Offer Valid Until</label>
                <input
                  id="bid-valid-date"
                  type="date"
                  className="form-input"
                  value={bidForm.validUntil}
                  onChange={(e) => setBidForm({ ...bidForm, validUntil: e.target.value })}
                  required
                />
              </div>

              {/* Notes */}
              <div style={{ gridColumn: 'span 2' }}>
                <label htmlFor="bid-notes" className="form-label">Commercial Terms &amp; Delivery Notes</label>
                <input
                  id="bid-notes"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Ex-factory Karachi, 15 days delivery lead time..."
                  value={bidForm.notes}
                  onChange={(e) => setBidForm({ ...bidForm, notes: e.target.value })}
                />
              </div>
            </div>

            {/* Quoted Items Table */}
            <div>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--navy-900)', marginBottom: '0.5rem' }}>
                Item Rates &amp; Taxes
              </h4>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Qty</th>
                    <th style={{ width: '130px', textAlign: 'right' }}>Unit Price (PKR)</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>Tax %</th>
                    <th style={{ width: '130px', textAlign: 'right' }}>Total (PKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {bidForm.items.map((it, idx) => {
                    const price = Number(it.unitPrice) || 0;
                    const tax = Number(it.taxPercentage) || 0;
                    const lineTotal = it.quantity * price * (1 + tax / 100);

                    return (
                      <tr key={it.purchaseRequestItemId}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{it.itemName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{it.itemCode}</div>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{it.quantity}</td>
                        <td>
                          <input
                            type="number"
                            step="0.0001"
                            min="0.0001"
                            placeholder="0.00"
                            className="form-input form-input-sm"
                            value={it.unitPrice}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Number(e.target.value);
                              const updated = [...bidForm.items];
                              updated[idx] = { ...updated[idx], unitPrice: val };
                              setBidForm({ ...bidForm, items: updated });
                            }}
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="0"
                            className="form-input form-input-sm"
                            value={it.taxPercentage}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const updated = [...bidForm.items];
                              updated[idx] = { ...updated[idx], taxPercentage: val };
                              setBidForm({ ...bidForm, items: updated });
                            }}
                          />
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--navy-900)' }}>
                          {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </form>
        )}
      </Modal>

      {/* =========================================================================
          Quotation Comparison & Bid Award Modal
          ========================================================================= */}
      <Modal
        isOpen={!!comparisonRfq}
        onClose={() => setComparisonRfq(null)}
        size="lg"
        title={
          comparisonRfq ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Scale size={20} className="text-muted" />
              <span>Bid Comparison: {comparisonRfq.quotationNumber}</span>
            </div>
          ) : (
            'Bid Comparison'
          )
        }
        footer={
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setComparisonRfq(null)}
          >
            Close
          </button>
        }
      >
        {comparisonRfq && (
          <div>
            {isLoadingComparison ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <RefreshCw size={24} className="spin text-muted" style={{ margin: '0 auto 0.5rem' }} />
                <p className="text-muted">Loading vendor offer comparison...</p>
              </div>
            ) : comparisonRfq.vendorQuotations?.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p className="text-muted">No supplier quotations have been recorded for this RFQ yet.</p>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Linked to Requisition: <span style={{ fontWeight: 600, color: 'var(--navy-900)' }}>{comparisonRfq.purchaseRequestNumber}</span>
                  </div>
                  <div>
                    {renderStatusBadge(comparisonRfq.status)}
                  </div>
                </div>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px', textAlign: 'center' }}>Rank</th>
                      <th>Bidding Supplier</th>
                      <th>Quotation #</th>
                      <th>Valid Until</th>
                      <th style={{ textAlign: 'right' }}>Total Bid Amount</th>
                      <th style={{ textAlign: 'center' }}>Award Status</th>
                      <th style={{ textAlign: 'right' }}>Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRfq.vendorQuotations.map((vq) => {
                      const rankIndex = comparisonItems.findIndex((ci) => ci.vendorQuotationId === vq.id);
                      const rank = rankIndex !== -1 ? rankIndex + 1 : null;
                      return (
                        <tr key={vq.id} className={vq.isSelected ? 'row-highlight' : undefined}>
                          <td style={{ textAlign: 'center' }}>
                            {rank ? (
                              <span
                                className={`badge ${rank === 1 ? 'badge-success' : 'badge-secondary'}`}
                                style={{ fontSize: '0.75rem' }}
                              >
                                #{rank}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>{vq.vendorName}</div>
                            {vq.notes && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{vq.notes}</div>}
                          </td>
                          <td><span className="code-badge">{vq.vendorQuotationNumber}</span></td>
                          <td>{formatDate(vq.validUntil)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--navy-900)' }}>
                            PKR {Number(vq.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {vq.isSelected ? (
                              <span className="badge badge-success" title="Selected winning proposal">
                                <Award size={13} /> Awarded
                              </span>
                            ) : (
                              <span className="text-muted" style={{ fontSize: '0.8125rem' }}>Offer Under Review</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {canAward &&
                              comparisonRfq.status === QuotationStatus.UnderComparison &&
                              !vq.isSelected && (
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() =>
                                    setSelectVendorConfirm({
                                      rfq: comparisonRfq,
                                      quotationId: vq.id,
                                      vendorName: vq.vendorName,
                                      amount: vq.totalAmount,
                                    })
                                  }
                                >
                                  <Award size={14} />
                                  <span>Award Contract</span>
                                </button>
                              )}
                            {vq.isSelected && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setComparisonRfq(null);
                                  navigate(
                                    `/procurement/orders?createRfqId=${comparisonRfq.id}&vendorQuotationId=${vq.id}`
                                  );
                                }}
                              >
                                <FileCheck size={14} />
                                <span>Create PO</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {itemPriceMatrix.length > 0 && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--navy-900)', marginBottom: '0.75rem' }}>
                      Item-by-Item Price Matrix
                    </h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Item Details</th>
                            <th>Req. Qty</th>
                            {comparisonRfq.vendorQuotations.map((vq) => (
                              <th key={vq.vendorId} style={{ textAlign: 'right' }}>
                                {vq.vendorName}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {itemPriceMatrix.map((cItem) => (
                            <tr key={cItem.purchaseRequestItemId}>
                              <td>
                                <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>{cItem.itemName}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cItem.itemCode}</div>
                              </td>
                              <td style={{ whiteSpace: 'nowrap' }}>
                                {cItem.quantity}
                              </td>
                              {comparisonRfq.vendorQuotations.map((vq) => {
                                const offer = cItem.vendorOffers.find((o) => o.vendorId === vq.vendorId);
                                if (!offer) {
                                  return (
                                    <td key={vq.vendorId} style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                                      -
                                    </td>
                                  );
                                }
                                return (
                                  <td
                                    key={vq.vendorId}
                                    style={{
                                      textAlign: 'right',
                                      backgroundColor: offer.isLowestPrice ? '#ecfdf5' : undefined,
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontWeight: offer.isLowestPrice ? 700 : 500,
                                        color: offer.isLowestPrice ? '#047857' : 'inherit',
                                      }}
                                    >
                                      PKR {Number(offer.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    {offer.taxPercentage > 0 && (
                                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                                        +{offer.taxPercentage}% tax
                                      </div>
                                    )}
                                    {offer.isLowestPrice && (
                                      <span
                                        className="badge badge-success"
                                        style={{ fontSize: '0.625rem', padding: '0.1rem 0.35rem', marginTop: '0.2rem', display: 'inline-block' }}
                                      >
                                        Lowest Price
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* =========================================================================
          View Quotation Details Modal
          ========================================================================= */}
      <Modal
        isOpen={!!viewingQuotation}
        onClose={() => setViewingQuotation(null)}
        size="lg"
        title={
          viewingQuotation ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="code-badge">{viewingQuotation.quotationNumber}</span>
              <span>RFQ Details</span>
            </div>
          ) : (
            'RFQ Details'
          )
        }
        footer={
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setViewingQuotation(null)}
          >
            Close
          </button>
        }
      >
        {viewingQuotation && (
          <div>
            <div className="detail-grid" style={{ marginBottom: '1.25rem' }}>
              <div className="detail-item">
                <div className="detail-label">RFQ Number</div>
                <div className="detail-value"><span className="code-badge">{viewingQuotation.quotationNumber}</span></div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Status</div>
                <div className="detail-value">{renderStatusBadge(viewingQuotation.status)}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Linked Purchase Request</div>
                <div className="detail-value">{viewingQuotation.purchaseRequestNumber}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Bidding Deadline (Closing Date)</div>
                <div className="detail-value">{formatDate(viewingQuotation.closingDate)}</div>
              </div>
              {viewingQuotation.notes && (
                <div className="detail-item full-width">
                  <div className="detail-label">Notes &amp; Scope</div>
                  <div className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>
                    {viewingQuotation.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Bids Breakdown */}
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--navy-900)', marginBottom: '0.5rem' }}>
                Recorded Supplier Offers ({viewingQuotation.vendorQuotations?.length || 0})
              </h4>
              {viewingQuotation.vendorQuotations?.length === 0 ? (
                <p className="text-muted" style={{ fontSize: '0.875rem' }}>No bids recorded yet.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Supplier</th>
                      <th>Quotation #</th>
                      <th>Submitted Date</th>
                      <th>Valid Until</th>
                      <th style={{ textAlign: 'right' }}>Total (PKR)</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingQuotation.vendorQuotations.map((vq) => (
                      <tr key={vq.id}>
                        <td style={{ fontWeight: 600 }}>{vq.vendorName}</td>
                        <td><span className="code-badge">{vq.vendorQuotationNumber}</span></td>
                        <td>{formatDate(vq.submittedAt)}</td>
                        <td>{formatDate(vq.validUntil)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                          {Number(vq.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {vq.isSelected ? (
                            <span className="badge badge-success"><Award size={12} /> Awarded</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* =========================================================================
          Confirmation Dialogs
          ========================================================================= */}
      {/* Send To Vendors Confirmation */}
      <ConfirmDialog
        isOpen={!!sendToVendorsConfirm}
        onClose={() => setSendToVendorsConfirm(null)}
        onConfirm={handleSendToVendors}
        title="Send RFQ to Vendors"
        message={`Send Quotation Request "${sendToVendorsConfirm?.quotationNumber}" to vendors? This will open supplier quotation submission.`}
        confirmLabel="Send RFQ"
        variant="success"
        isLoading={isActionLoading}
      />

      {/* Mark Responses Received Confirmation */}
      <ConfirmDialog
        isOpen={!!responsesReceivedConfirm}
        onClose={() => setResponsesReceivedConfirm(null)}
        onConfirm={handleResponsesReceived}
        title="Mark Responses Received"
        message={`Close supplier bidding for "${responsesReceivedConfirm?.quotationNumber}"?`}
        confirmLabel="Mark Received"
        variant="warning"
        isLoading={isActionLoading}
      />

      {/* Start Comparison Confirmation */}
      <ConfirmDialog
        isOpen={!!startComparisonConfirm}
        onClose={() => setStartComparisonConfirm(null)}
        onConfirm={handleStartComparison}
        title="Start Bid Comparison"
        message={`Begin bid evaluation for "${startComparisonConfirm?.quotationNumber}"?`}
        confirmLabel="Start Comparison"
        variant="warning"
        isLoading={isActionLoading}
      />

      {/* Award Vendor Quotation Confirmation */}
      <ConfirmDialog
        isOpen={!!selectVendorConfirm}
        onClose={() => setSelectVendorConfirm(null)}
        onConfirm={handleSelectVendorQuotation}
        title="Award Supplier Contract"
        message={`Award RFQ "${selectVendorConfirm?.rfq.quotationNumber}" to "${selectVendorConfirm?.vendorName}" for PKR ${Number(selectVendorConfirm?.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}? This will mark the RFQ as Awarded and qualify this bid for Purchase Order issuance.`}
        confirmLabel="Award Bid"
        variant="success"
        isLoading={isActionLoading}
      />

      {/* Cancel RFQ Confirmation */}
      <ConfirmDialog
        isOpen={!!cancelRfqConfirm}
        onClose={() => setCancelRfqConfirm(null)}
        onConfirm={handleCancelRfq}
        title="Cancel Quotation Request"
        message={`Are you sure you want to cancel Quotation Request "${cancelRfqConfirm?.quotationNumber}"?`}
        confirmLabel="Cancel RFQ"
        variant="danger"
        isLoading={isActionLoading}
      />
    </div>
  );
};
