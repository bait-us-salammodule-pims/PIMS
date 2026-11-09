import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  RefreshCw,
  Search,
  Edit2,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Send,
  Play,
  Ban,
  Calendar,
  Trash2,
  Lock,
  ShoppingCart,
} from 'lucide-react';
import { procurementService } from '../../api/procurementService';
import { organizationService } from '../../api/organizationService';
import { itemService } from '../../api/itemService';
import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  PurchaseRequestStatus,
  PURCHASE_REQUEST_STATUS_LABELS,
  type PurchaseRequestResponse,
  type CreatePurchaseRequestDto,
  type UpdatePurchaseRequestDto,
  type CreatePurchaseRequestItemDto,
} from '../../types/procurement';
import type { Department, SubDepartment } from '../../types/organization';
import type { Item, UnitOfMeasure } from '../../types/item';

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

interface ItemRowDraft {
  itemId: number | '';
  quantity: number | '';
  unitOfMeasureId: number | '';
  remarks: string;
}

export const PurchaseRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canView = hasPermission('PurchaseRequestView') || hasPermission('ApprovalView');
  const canCreate = hasPermission('PurchaseRequestCreate');
  const canUpdate = hasPermission('PurchaseRequestUpdate');
  const canSubmit = hasPermission('PurchaseRequestSubmit');
  const canApprove = hasPermission('ApprovalApprove') || hasPermission('PurchaseRequestUpdate');
  const canReject = hasPermission('ApprovalReject') || hasPermission('PurchaseRequestUpdate');

  // State
  const [requests, setRequests] = useState<PurchaseRequestResponse[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [catalogItems, setCatalogItems] = useState<Item[]>([]);
  const [uoms, setUoms] = useState<UnitOfMeasure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [viewTab, setViewTab] = useState<'all' | 'pending-approval'>('all');

  // Modals & Actions
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [viewingRequest, setViewingRequest] = useState<PurchaseRequestResponse | null>(null);
  const [editingRequest, setEditingRequest] = useState<PurchaseRequestResponse | null>(null);

  // Confirmation Dialogs State
  const [submitConfirmRequest, setSubmitConfirmRequest] = useState<PurchaseRequestResponse | null>(null);
  const [startReviewConfirmRequest, setStartReviewConfirmRequest] = useState<PurchaseRequestResponse | null>(null);
  const [approveConfirmRequest, setApproveConfirmRequest] = useState<PurchaseRequestResponse | null>(null);
  const [rejectConfirmRequest, setRejectConfirmRequest] = useState<PurchaseRequestResponse | null>(null);
  const [cancelConfirmRequest, setCancelConfirmRequest] = useState<PurchaseRequestResponse | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Create Form State
  const [createForm, setCreateForm] = useState<{
    requestNumber: string;
    departmentId: number | '';
    subDepartmentId: number | '';
    requiredDate: string;
    justification: string;
    items: ItemRowDraft[];
  }>({
    requestNumber: '',
    departmentId: '',
    subDepartmentId: '',
    requiredDate: getTodayIso(),
    justification: '',
    items: [{ itemId: '', quantity: 1, unitOfMeasureId: '', remarks: '' }],
  });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  // Edit Form State
  const [editForm, setEditForm] = useState<{
    departmentId: number | '';
    subDepartmentId: number | '';
    requiredDate: string;
    justification: string;
  }>({
    departmentId: '',
    subDepartmentId: '',
    requiredDate: getTodayIso(),
    justification: '',
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // Add Item to existing draft
  const [newItemDraft, setNewItemDraft] = useState<ItemRowDraft>({
    itemId: '',
    quantity: 1,
    unitOfMeasureId: '',
    remarks: '',
  });

  // Load Dependencies and PRs
  const loadData = useCallback(async () => {
    if (!canView) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [prs, depts, subs, items, uomList] = await Promise.all([
        procurementService.getPurchaseRequests(),
        organizationService.getDepartments(),
        organizationService.getSubDepartments(),
        itemService.getItems(),
        itemService.getUnitsOfMeasure(),
      ]);
      setRequests(prs);
      setDepartments(depts);
      setSubDepartments(subs);
      setCatalogItems(items);
      setUoms(uomList);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to load purchase requests data.'));
    } finally {
      setIsLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered Requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // Pending Approval quick tab
      if (viewTab === 'pending-approval') {
        if (
          r.status !== PurchaseRequestStatus.Submitted &&
          r.status !== PurchaseRequestStatus.UnderReview
        ) {
          return false;
        }
      }

      // Status dropdown
      if (statusFilter !== 'all') {
        if (r.status !== Number(statusFilter)) return false;
      }

      // Department dropdown
      if (departmentFilter !== 'all') {
        if (r.departmentId !== Number(departmentFilter)) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesNum = r.requestNumber.toLowerCase().includes(query);
        const matchesReq = r.requestedByName?.toLowerCase().includes(query) ?? false;
        const matchesDept = r.departmentName?.toLowerCase().includes(query) ?? false;
        const matchesSubDept = r.subDepartmentName?.toLowerCase().includes(query) ?? false;
        const matchesJust = r.justification.toLowerCase().includes(query);
        const matchesItems = r.items?.some(
          (i) =>
            i.itemCode.toLowerCase().includes(query) ||
            i.itemName.toLowerCase().includes(query)
        );
        return matchesNum || matchesReq || matchesDept || matchesSubDept || matchesJust || matchesItems;
      }

      return true;
    });
  }, [requests, viewTab, statusFilter, departmentFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = requests.length;
    const draft = requests.filter((r) => r.status === PurchaseRequestStatus.Draft).length;
    const pendingReview = requests.filter(
      (r) =>
        r.status === PurchaseRequestStatus.Submitted ||
        r.status === PurchaseRequestStatus.UnderReview
    ).length;
    const approved = requests.filter((r) => r.status === PurchaseRequestStatus.Approved).length;
    const rejected = requests.filter((r) => r.status === PurchaseRequestStatus.Rejected).length;
    return { total, draft, pendingReview, approved, rejected };
  }, [requests]);

  // Sub-departments for Create form
  const availableCreateSubDepartments = useMemo(() => {
    if (!createForm.departmentId) return [];
    return subDepartments.filter((s) => s.departmentId === Number(createForm.departmentId));
  }, [subDepartments, createForm.departmentId]);

  // Sub-departments for Edit form
  const availableEditSubDepartments = useMemo(() => {
    if (!editForm.departmentId) return [];
    return subDepartments.filter((s) => s.departmentId === Number(editForm.departmentId));
  }, [subDepartments, editForm.departmentId]);

  // Status Badge Helper
  const renderStatusBadge = (status: PurchaseRequestStatus) => {
    switch (status) {
      case PurchaseRequestStatus.Draft:
        return <span className="badge badge-secondary">Draft</span>;
      case PurchaseRequestStatus.Submitted:
        return (
          <span className="badge badge-cyan" title="Submitted for approval">
            <Send size={12} /> Submitted
          </span>
        );
      case PurchaseRequestStatus.UnderReview:
        return (
          <span className="badge badge-warning" title="Under active review">
            <Clock size={12} /> Under Review
          </span>
        );
      case PurchaseRequestStatus.Approved:
        return (
          <span className="badge badge-success" title="Approved for RFQ / Purchase Order">
            <CheckCircle size={12} /> Approved
          </span>
        );
      case PurchaseRequestStatus.Rejected:
        return (
          <span className="badge badge-danger" title="Rejected by reviewer">
            <XCircle size={12} /> Rejected
          </span>
        );
      case PurchaseRequestStatus.Cancelled:
        return <span className="badge badge-secondary">Cancelled</span>;
      default:
        return <span className="badge badge-secondary">Unknown</span>;
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    const defaultNumber = `PR-${new Date().getFullYear()}-${String(requests.length + 1).padStart(4, '0')}`;
    const firstDept = departments.find((d) => d.isActive);
    setCreateForm({
      requestNumber: defaultNumber,
      departmentId: firstDept ? firstDept.id : '',
      subDepartmentId: '',
      requiredDate: getTodayIso(),
      justification: '',
      items: [{ itemId: '', quantity: 1, unitOfMeasureId: '', remarks: '' }],
    });
    setCreateErrors({});
    setIsCreateModalOpen(true);
  };

  // Create Form Items Handlers
  const handleAddCreateItemRow = () => {
    setCreateForm((prev) => ({
      ...prev,
      items: [...prev.items, { itemId: '', quantity: 1, unitOfMeasureId: '', remarks: '' }],
    }));
  };

  const handleRemoveCreateItemRow = (index: number) => {
    setCreateForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleCreateItemChange = (index: number, field: keyof ItemRowDraft, value: unknown) => {
    setCreateForm((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, items: updated };
    });
  };

  // Validate Create Form
  const validateCreateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!createForm.requestNumber.trim()) {
      errors.requestNumber = 'Request number is required.';
    }

    if (!createForm.departmentId) {
      errors.departmentId = 'Department is required.';
    }

    if (!createForm.requiredDate) {
      errors.requiredDate = 'Required date is required.';
    }

    if (!createForm.justification.trim()) {
      errors.justification = 'Justification is required.';
    }

    if (createForm.items.length === 0) {
      errors.items = 'At least one item is required.';
    } else {
      const selectedItemIds: number[] = [];
      for (let i = 0; i < createForm.items.length; i++) {
        const item = createForm.items[i];
        if (!item.itemId || Number(item.itemId) <= 0) {
          errors[`item_${i}`] = 'Please select an item.';
        } else {
          const id = Number(item.itemId);
          if (selectedItemIds.includes(id)) {
            errors[`item_${i}`] = 'Item cannot appear more than once in the request.';
          } else {
            selectedItemIds.push(id);
          }
        }

        if (item.quantity === '' || Number(item.quantity) <= 0) {
          errors[`qty_${i}`] = 'Quantity must be greater than zero.';
        }
      }
    }

    setCreateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCreateForm()) return;

    setIsActionLoading(true);
    setErrorMessage(null);

    const payload: CreatePurchaseRequestDto = {
      requestNumber: createForm.requestNumber.trim().toUpperCase(),
      departmentId: Number(createForm.departmentId),
      subDepartmentId: createForm.subDepartmentId ? Number(createForm.subDepartmentId) : null,
      requiredDate: new Date(createForm.requiredDate).toISOString(),
      justification: createForm.justification.trim(),
      items: createForm.items.map((i) => ({
        itemId: Number(i.itemId),
        quantity: Number(i.quantity),
        unitOfMeasureId: i.unitOfMeasureId ? Number(i.unitOfMeasureId) : null,
        remarks: i.remarks.trim() || null,
      })),
    };

    try {
      const created = await procurementService.createPurchaseRequest(payload);
      setSuccessMessage(`Purchase Request "${created.requestNumber}" created in Draft status.`);
      setIsCreateModalOpen(false);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to create purchase request.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (req: PurchaseRequestResponse) => {
    setEditingRequest(req);
    setEditForm({
      departmentId: req.departmentId,
      subDepartmentId: req.subDepartmentId || '',
      requiredDate: req.requiredDate.split('T')[0],
      justification: req.justification,
    });
    setNewItemDraft({ itemId: '', quantity: 1, unitOfMeasureId: '', remarks: '' });
    setEditErrors({});
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequest) return;

    const errors: Record<string, string> = {};
    if (!editForm.departmentId) errors.departmentId = 'Department is required.';
    if (!editForm.requiredDate) errors.requiredDate = 'Required date is required.';
    if (!editForm.justification.trim()) errors.justification = 'Justification is required.';

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    setIsActionLoading(true);
    setErrorMessage(null);

    const payload: UpdatePurchaseRequestDto = {
      departmentId: Number(editForm.departmentId),
      subDepartmentId: editForm.subDepartmentId ? Number(editForm.subDepartmentId) : null,
      requiredDate: new Date(editForm.requiredDate).toISOString(),
      justification: editForm.justification.trim(),
    };

    try {
      await procurementService.updatePurchaseRequest(editingRequest.id, payload);
      setSuccessMessage(`Purchase Request "${editingRequest.requestNumber}" updated successfully.`);
      setIsEditModalOpen(false);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to update purchase request.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Add Item to Draft during Edit
  const handleAddItemToDraft = async () => {
    if (!editingRequest) return;
    if (!newItemDraft.itemId || Number(newItemDraft.itemId) <= 0) {
      alert('Please select an item to add.');
      return;
    }
    if (newItemDraft.quantity === '' || Number(newItemDraft.quantity) <= 0) {
      alert('Quantity must be greater than zero.');
      return;
    }

    setIsActionLoading(true);
    try {
      const payload: CreatePurchaseRequestItemDto = {
        itemId: Number(newItemDraft.itemId),
        quantity: Number(newItemDraft.quantity),
        unitOfMeasureId: newItemDraft.unitOfMeasureId ? Number(newItemDraft.unitOfMeasureId) : null,
        remarks: newItemDraft.remarks.trim() || null,
      };
      await procurementService.addPurchaseRequestItem(editingRequest.id, payload);
      // Reload this request
      const updated = await procurementService.getPurchaseRequestById(editingRequest.id);
      setEditingRequest(updated);
      setNewItemDraft({ itemId: '', quantity: 1, unitOfMeasureId: '', remarks: '' });
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to add item to request.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Remove Item from Draft during Edit
  const handleRemoveItemFromDraft = async (itemId: number) => {
    if (!editingRequest) return;
    if (editingRequest.items.length <= 1) {
      alert('Purchase Request must retain at least one item.');
      return;
    }

    setIsActionLoading(true);
    try {
      await procurementService.removePurchaseRequestItem(editingRequest.id, itemId);
      const updated = await procurementService.getPurchaseRequestById(editingRequest.id);
      setEditingRequest(updated);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to remove item.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Status Action Handlers
  const handleSubmitRequest = async () => {
    if (!submitConfirmRequest) return;
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      await procurementService.submitPurchaseRequest(submitConfirmRequest.id);
      setSuccessMessage(`Purchase Request "${submitConfirmRequest.requestNumber}" submitted for review.`);
      setSubmitConfirmRequest(null);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to submit request.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStartReview = async () => {
    if (!startReviewConfirmRequest) return;
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      await procurementService.startReviewPurchaseRequest(startReviewConfirmRequest.id);
      setSuccessMessage(`Review started for "${startReviewConfirmRequest.requestNumber}".`);
      setStartReviewConfirmRequest(null);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to start review.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approveConfirmRequest) return;
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      await procurementService.approvePurchaseRequest(approveConfirmRequest.id);
      setSuccessMessage(`Purchase Request "${approveConfirmRequest.requestNumber}" approved.`);
      setApproveConfirmRequest(null);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to approve purchase request.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectConfirmRequest) return;
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      await procurementService.rejectPurchaseRequest(rejectConfirmRequest.id);
      setSuccessMessage(`Purchase Request "${rejectConfirmRequest.requestNumber}" rejected.`);
      setRejectConfirmRequest(null);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to reject purchase request.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelConfirmRequest) return;
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      await procurementService.cancelPurchaseRequest(cancelConfirmRequest.id);
      setSuccessMessage(`Purchase Request "${cancelConfirmRequest.requestNumber}" has been cancelled.`);
      setCancelConfirmRequest(null);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to cancel purchase request.'));
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
            You do not have permission to view Purchase Requests.
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
            <FileText size={24} />
          </div>
          <div>
            <h1>Purchase Requests</h1>
            <p className="page-header-subtitle">
              Manage departmental requisitions, item requirements, and supervisory approval lifecycle.
            </p>
          </div>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadData}
            disabled={isLoading}
            title="Refresh requests"
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
              <span>New Purchase Request</span>
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
            Total Requests
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--navy-900)' }}>
            {stats.total}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Draft Requisitions
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--navy-600)' }}>
            {stats.draft}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Pending Review &amp; Approval
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: '#b45309' }}>
            {stats.pendingReview}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Approved
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
            {stats.approved}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Rejected
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--accent-rose)' }}>
            {stats.rejected}
          </div>
        </div>
      </div>

      {/* Tabs and Filter Bar */}
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
          {/* Quick Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className={`btn btn-sm ${viewTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewTab('all')}
            >
              All Requests ({requests.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${viewTab === 'pending-approval' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewTab('pending-approval')}
            >
              Pending Approval ({stats.pendingReview})
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 360 }}>
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
              placeholder="Search request #, requester, item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Dropdown Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <label htmlFor="pr-status-filter" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Status:
              </label>
              <select
                id="pr-status-filter"
                className="form-select"
                style={{ width: 'auto', minWidth: '130px' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                {Object.entries(PURCHASE_REQUEST_STATUS_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <label htmlFor="pr-dept-filter" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Department:
              </label>
              <select
                id="pr-dept-filter"
                className="form-select"
                style={{ width: 'auto', minWidth: '160px' }}
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="card table-container">
        {isLoading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <RefreshCw size={32} className="spin text-muted" style={{ margin: '0 auto 1rem' }} />
            <p className="text-muted">Loading purchase requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <FileText size={44} className="text-muted" style={{ margin: '0 auto 1rem', opacity: 0.6 }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--navy-900)' }}>
              No Purchase Requests Found
            </h3>
            <p className="text-muted" style={{ maxWidth: 420, margin: '0.5rem auto 1.25rem' }}>
              {searchQuery || statusFilter !== 'all' || departmentFilter !== 'all' || viewTab !== 'all'
                ? 'No purchase requests match your search and filter criteria.'
                : 'No purchase requests have been raised yet.'}
            </p>
            {canCreate && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenCreate}
              >
                <Plus size={16} />
                <span>New Purchase Request</span>
              </button>
            )}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '140px' }}>Request #</th>
                <th>Department / Unit</th>
                <th>Requested By</th>
                <th>Required Date</th>
                <th style={{ textAlign: 'center' }}>Items</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'right', width: '220px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((req) => (
                <tr key={req.id}>
                  <td>
                    <span className="code-badge">{req.requestNumber}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>{req.departmentName}</div>
                    {req.subDepartmentName && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {req.subDepartmentName}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.875rem', color: 'var(--navy-900)' }}>{req.requestedByName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Created {formatDate(req.createdAt)}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem' }}>
                      <Calendar size={13} className="text-muted" />
                      <span>{formatDate(req.requiredDate)}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-secondary" title={`${req.items?.length || 0} line items requested`}>
                      {req.items?.length || 0} Items
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {renderStatusBadge(req.status)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      {/* View Details */}
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        title="View Full Request Details"
                        onClick={() => setViewingRequest(req)}
                      >
                        <Eye size={15} />
                      </button>

                      {/* Edit (Draft only) */}
                      {canUpdate && req.status === PurchaseRequestStatus.Draft && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          title="Edit Draft Request"
                          onClick={() => handleOpenEdit(req)}
                        >
                          <Edit2 size={15} />
                        </button>
                      )}

                      {/* Submit (Draft only) */}
                      {canSubmit && req.status === PurchaseRequestStatus.Draft && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--blue-600)' }}
                          title="Submit Request for Review"
                          onClick={() => setSubmitConfirmRequest(req)}
                        >
                          <Send size={15} />
                        </button>
                      )}

                      {/* Start Review (Submitted only) */}
                      {canApprove && req.status === PurchaseRequestStatus.Submitted && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: '#b45309' }}
                          title="Start Active Review"
                          onClick={() => setStartReviewConfirmRequest(req)}
                        >
                          <Play size={15} />
                        </button>
                      )}

                      {/* Approve (UnderReview only) */}
                      {canApprove && req.status === PurchaseRequestStatus.UnderReview && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--accent-emerald)' }}
                          title="Approve Purchase Request"
                          onClick={() => setApproveConfirmRequest(req)}
                        >
                          <CheckCircle size={15} />
                        </button>
                      )}

                      {/* Reject (UnderReview only) */}
                      {canReject && req.status === PurchaseRequestStatus.UnderReview && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--accent-rose)' }}
                          title="Reject Purchase Request"
                          onClick={() => setRejectConfirmRequest(req)}
                        >
                          <XCircle size={15} />
                        </button>
                      )}

                      {/* Create RFQ Quick Action (Approved only) */}
                      {req.status === PurchaseRequestStatus.Approved && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--blue-600)' }}
                          title="Issue Quotation / RFQ from this PR"
                          onClick={() => navigate(`/procurement/quotations?createPrId=${req.id}`)}
                        >
                          <ShoppingCart size={15} />
                        </button>
                      )}

                      {/* Cancel (Draft, Submitted, UnderReview) */}
                      {canUpdate &&
                        (req.status === PurchaseRequestStatus.Draft ||
                          req.status === PurchaseRequestStatus.Submitted ||
                          req.status === PurchaseRequestStatus.UnderReview) && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--accent-rose)' }}
                            title="Cancel Purchase Request"
                            onClick={() => setCancelConfirmRequest(req)}
                          >
                            <Ban size={15} />
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* =========================================================================
          Create Purchase Request Modal
          ========================================================================= */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        size="lg"
        title="Raise New Purchase Request"
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
              {isActionLoading ? (
                <>
                  <RefreshCw size={14} className="spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Save Draft Request</span>
              )}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} noValidate>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            {/* Request Number */}
            <div>
              <label htmlFor="pr-create-num" className="form-label required">Request #</label>
              <input
                id="pr-create-num"
                type="text"
                className={`form-input ${createErrors.requestNumber ? 'border-danger' : ''}`}
                value={createForm.requestNumber}
                onChange={(e) => setCreateForm({ ...createForm, requestNumber: e.target.value })}
                required
              />
              {createErrors.requestNumber && <div className="form-error">{createErrors.requestNumber}</div>}
            </div>

            {/* Required Date */}
            <div>
              <label htmlFor="pr-create-date" className="form-label required">Required By Date</label>
              <input
                id="pr-create-date"
                type="date"
                className={`form-input ${createErrors.requiredDate ? 'border-danger' : ''}`}
                value={createForm.requiredDate}
                onChange={(e) => setCreateForm({ ...createForm, requiredDate: e.target.value })}
                required
              />
              {createErrors.requiredDate && <div className="form-error">{createErrors.requiredDate}</div>}
            </div>

            {/* Department */}
            <div>
              <label htmlFor="pr-create-dept" className="form-label required">Requesting Department</label>
              <select
                id="pr-create-dept"
                className={`form-select ${createErrors.departmentId ? 'border-danger' : ''}`}
                value={createForm.departmentId ? String(createForm.departmentId) : ''}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    departmentId: e.target.value === '' ? '' : Number(e.target.value),
                    subDepartmentId: '', // Reset sub-department on change
                  })
                }
                required
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              {createErrors.departmentId && <div className="form-error">{createErrors.departmentId}</div>}
            </div>

            {/* Sub-Department */}
            <div>
              <label htmlFor="pr-create-subdept" className="form-label">Sub-Department / Unit (Optional)</label>
              <select
                id="pr-create-subdept"
                className="form-select"
                value={createForm.subDepartmentId ? String(createForm.subDepartmentId) : ''}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    subDepartmentId: e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
                disabled={!createForm.departmentId || availableCreateSubDepartments.length === 0}
              >
                <option value="">None / General</option>
                {availableCreateSubDepartments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Justification */}
            <div style={{ gridColumn: 'span 2' }}>
              <label htmlFor="pr-create-just" className="form-label required">Business Justification &amp; Purpose</label>
              <textarea
                id="pr-create-just"
                className={`form-textarea ${createErrors.justification ? 'border-danger' : ''}`}
                rows={2}
                placeholder="Explain the operational necessity for this purchase..."
                value={createForm.justification}
                onChange={(e) => setCreateForm({ ...createForm, justification: e.target.value })}
                required
              />
              {createErrors.justification && (
                <div className="form-error">{createErrors.justification}</div>
              )}
            </div>
          </div>

          {/* Line Items Section */}
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--navy-900)' }}>
                  Requested Line Items
                </h4>
                <div className="form-hint">At least one item is required. Duplicate items are not allowed.</div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddCreateItemRow}
              >
                <Plus size={14} />
                <span>Add Item Row</span>
              </button>
            </div>

            {createErrors.items && <div className="form-error" style={{ marginBottom: '0.5rem' }}>{createErrors.items}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {createForm.items.map((row, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '3fr 1.2fr 1.5fr 2.5fr auto',
                    gap: '0.5rem',
                    alignItems: 'start',
                    background: 'var(--bg-surface-subtle)',
                    padding: '0.625rem',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  {/* Item Selector */}
                  <div>
                    <select
                      className={`form-select form-select-sm ${createErrors[`item_${idx}`] ? 'border-danger' : ''}`}
                      value={row.itemId ? String(row.itemId) : ''}
                      onChange={(e) =>
                        handleCreateItemChange(
                          idx,
                          'itemId',
                          e.target.value === '' ? '' : Number(e.target.value)
                        )
                      }
                    >
                      <option value="">Select Catalog Item</option>
                      {catalogItems.map((item) => (
                        <option key={item.id} value={item.id} disabled={!item.isActive}>
                          [{item.itemCode}] {item.name} {!item.isActive ? '(Inactive)' : ''}
                        </option>
                      ))}
                    </select>
                    {createErrors[`item_${idx}`] && (
                      <div className="form-error">{createErrors[`item_${idx}`]}</div>
                    )}
                  </div>

                  {/* Quantity */}
                  <div>
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      placeholder="Qty"
                      className={`form-input form-input-sm ${createErrors[`qty_${idx}`] ? 'border-danger' : ''}`}
                      value={row.quantity}
                      onChange={(e) =>
                        handleCreateItemChange(
                          idx,
                          'quantity',
                          e.target.value === '' ? '' : Number(e.target.value)
                        )
                      }
                    />
                    {createErrors[`qty_${idx}`] && (
                      <div className="form-error">{createErrors[`qty_${idx}`]}</div>
                    )}
                  </div>

                  {/* Unit of Measure */}
                  <div>
                    <select
                      className="form-select form-select-sm"
                      value={row.unitOfMeasureId ? String(row.unitOfMeasureId) : ''}
                      onChange={(e) =>
                        handleCreateItemChange(
                          idx,
                          'unitOfMeasureId',
                          e.target.value === '' ? '' : Number(e.target.value)
                        )
                      }
                    >
                      <option value="">Default UOM</option>
                      {uoms.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.code} ({u.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Remarks */}
                  <div>
                    <input
                      type="text"
                      placeholder="Line notes / specifications"
                      className="form-input form-input-sm"
                      value={row.remarks}
                      onChange={(e) => handleCreateItemChange(idx, 'remarks', e.target.value)}
                    />
                  </div>

                  {/* Remove Row Button */}
                  <div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--accent-rose)' }}
                      title="Remove line item"
                      onClick={() => handleRemoveCreateItemRow(idx)}
                      disabled={createForm.items.length <= 1}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          Edit Purchase Request Modal (Draft Only)
          ========================================================================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        size="lg"
        title={editingRequest ? `Edit Draft Request: ${editingRequest.requestNumber}` : 'Edit Request'}
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
              {isActionLoading ? 'Saving...' : 'Update Request'}
            </button>
          </>
        }
      >
        {editingRequest && (
          <form onSubmit={handleEditSubmit} noValidate>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label htmlFor="pr-edit-dept" className="form-label required">Department</label>
                <select
                  id="pr-edit-dept"
                  className="form-select"
                  value={editForm.departmentId ? String(editForm.departmentId) : ''}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      departmentId: e.target.value === '' ? '' : Number(e.target.value),
                      subDepartmentId: '',
                    })
                  }
                  required
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                {editErrors.departmentId && <div className="form-error">{editErrors.departmentId}</div>}
              </div>

              <div>
                <label htmlFor="pr-edit-subdept" className="form-label">Sub-Department</label>
                <select
                  id="pr-edit-subdept"
                  className="form-select"
                  value={editForm.subDepartmentId ? String(editForm.subDepartmentId) : ''}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      subDepartmentId: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                >
                  <option value="">None / General</option>
                  {availableEditSubDepartments.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="pr-edit-date" className="form-label required">Required By Date</label>
                <input
                  id="pr-edit-date"
                  type="date"
                  className="form-input"
                  value={editForm.requiredDate}
                  onChange={(e) => setEditForm({ ...editForm, requiredDate: e.target.value })}
                  required
                />
                {editErrors.requiredDate && <div className="form-error">{editErrors.requiredDate}</div>}
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label htmlFor="pr-edit-just" className="form-label required">Justification</label>
                <textarea
                  id="pr-edit-just"
                  className="form-textarea"
                  rows={2}
                  value={editForm.justification}
                  onChange={(e) => setEditForm({ ...editForm, justification: e.target.value })}
                  required
                />
                {editErrors.justification && <div className="form-error">{editErrors.justification}</div>}
              </div>
            </div>

            {/* Current Items List */}
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--navy-900)', marginBottom: '0.5rem' }}>
                Current Items in this Request
              </h4>
              <table className="data-table" style={{ marginBottom: '1rem' }}>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Item Name</th>
                    <th>Quantity</th>
                    <th>UOM</th>
                    <th>Remarks</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {editingRequest.items.map((item) => (
                    <tr key={item.id}>
                      <td><span className="code-badge">{item.itemCode}</span></td>
                      <td>{item.itemName}</td>
                      <td>{item.quantity}</td>
                      <td>{item.unitOfMeasureName || '—'}</td>
                      <td>{item.remarks || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--accent-rose)' }}
                          title="Remove item"
                          onClick={() => handleRemoveItemFromDraft(item.id)}
                          disabled={editingRequest.items.length <= 1 || isActionLoading}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Add New Item Row inline */}
              <div
                style={{
                  background: 'var(--bg-surface-subtle)',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  display: 'grid',
                  gridTemplateColumns: '3fr 1fr 1.5fr 2fr auto',
                  gap: '0.5rem',
                  alignItems: 'center',
                }}
              >
                <select
                  className="form-select form-select-sm"
                  value={newItemDraft.itemId ? String(newItemDraft.itemId) : ''}
                  onChange={(e) =>
                    setNewItemDraft({
                      ...newItemDraft,
                      itemId: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                >
                  <option value="">Add Another Item...</option>
                  {catalogItems
                    .filter((ci) => !editingRequest.items.some((ri) => ri.itemId === ci.id))
                    .map((item) => (
                      <option key={item.id} value={item.id} disabled={!item.isActive}>
                        [{item.itemCode}] {item.name}
                      </option>
                    ))}
                </select>

                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  placeholder="Qty"
                  className="form-input form-input-sm"
                  value={newItemDraft.quantity}
                  onChange={(e) =>
                    setNewItemDraft({
                      ...newItemDraft,
                      quantity: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                />

                <select
                  className="form-select form-select-sm"
                  value={newItemDraft.unitOfMeasureId ? String(newItemDraft.unitOfMeasureId) : ''}
                  onChange={(e) =>
                    setNewItemDraft({
                      ...newItemDraft,
                      unitOfMeasureId: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                >
                  <option value="">Default UOM</option>
                  {uoms.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.code}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Remarks"
                  className="form-input form-input-sm"
                  value={newItemDraft.remarks}
                  onChange={(e) => setNewItemDraft({ ...newItemDraft, remarks: e.target.value })}
                />

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAddItemToDraft}
                  disabled={!newItemDraft.itemId || isActionLoading}
                >
                  <Plus size={14} />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* =========================================================================
          View Purchase Request Details Modal
          ========================================================================= */}
      <Modal
        isOpen={!!viewingRequest}
        onClose={() => setViewingRequest(null)}
        size="lg"
        title={
          viewingRequest ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="code-badge">{viewingRequest.requestNumber}</span>
              <span>Purchase Request Details</span>
            </div>
          ) : (
            'Request Details'
          )
        }
        footer={
          viewingRequest && (
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {viewingRequest.status === PurchaseRequestStatus.Approved && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      const id = viewingRequest.id;
                      setViewingRequest(null);
                      navigate(`/procurement/quotations?createPrId=${id}`);
                    }}
                  >
                    <ShoppingCart size={14} />
                    <span>Issue Quotation / RFQ</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setViewingRequest(null)}
              >
                Close
              </button>
            </div>
          )
        }
      >
        {viewingRequest && (
          <div>
            <div className="detail-grid" style={{ marginBottom: '1.25rem' }}>
              <div className="detail-item">
                <div className="detail-label">Request Number</div>
                <div className="detail-value">
                  <span className="code-badge">{viewingRequest.requestNumber}</span>
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-label">Status</div>
                <div className="detail-value">{renderStatusBadge(viewingRequest.status)}</div>
              </div>

              <div className="detail-item">
                <div className="detail-label">Department</div>
                <div className="detail-value">
                  {viewingRequest.departmentName}{' '}
                  {viewingRequest.subDepartmentName ? `(${viewingRequest.subDepartmentName})` : ''}
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-label">Requested By</div>
                <div className="detail-value">{viewingRequest.requestedByName}</div>
              </div>

              <div className="detail-item">
                <div className="detail-label">Required Date</div>
                <div className="detail-value">{formatDate(viewingRequest.requiredDate)}</div>
              </div>

              <div className="detail-item">
                <div className="detail-label">Submitted On</div>
                <div className="detail-value">{formatDate(viewingRequest.createdAt)}</div>
              </div>

              <div className="detail-item full-width">
                <div className="detail-label">Justification &amp; Purpose</div>
                <div className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>
                  {viewingRequest.justification}
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--navy-900)', marginBottom: '0.5rem' }}>
                Item Specifications &amp; Quantities
              </h4>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU Code</th>
                    <th>Item Description</th>
                    <th style={{ textAlign: 'right' }}>Quantity</th>
                    <th>UOM</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingRequest.items.map((item) => (
                    <tr key={item.id}>
                      <td><span className="code-badge">{item.itemCode}</span></td>
                      <td style={{ fontWeight: 500 }}>{item.itemName}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.quantity}</td>
                      <td>{item.unitOfMeasureName || 'Default'}</td>
                      <td>{item.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* =========================================================================
          Confirmation Dialogs
          ========================================================================= */}
      {/* Submit Confirmation */}
      <ConfirmDialog
        isOpen={!!submitConfirmRequest}
        onClose={() => setSubmitConfirmRequest(null)}
        onConfirm={handleSubmitRequest}
        title="Submit Purchase Request"
        message={`Are you sure you want to submit "${submitConfirmRequest?.requestNumber}" for review? Once submitted, line items cannot be modified directly.`}
        confirmLabel="Submit Request"
        variant="success"
        isLoading={isActionLoading}
      />

      {/* Start Review Confirmation */}
      <ConfirmDialog
        isOpen={!!startReviewConfirmRequest}
        onClose={() => setStartReviewConfirmRequest(null)}
        onConfirm={handleStartReview}
        title="Start Review"
        message={`Begin formal review for Purchase Request "${startReviewConfirmRequest?.requestNumber}"? This will move the requisition into "Under Review" status.`}
        confirmLabel="Start Review"
        variant="warning"
        isLoading={isActionLoading}
      />

      {/* Approve Confirmation */}
      <ConfirmDialog
        isOpen={!!approveConfirmRequest}
        onClose={() => setApproveConfirmRequest(null)}
        onConfirm={handleApprove}
        title="Approve Purchase Request"
        message={`Approve Purchase Request "${approveConfirmRequest?.requestNumber}"? Approved requisitions can be quoted to suppliers and issued as Purchase Orders.`}
        confirmLabel="Approve Request"
        variant="success"
        isLoading={isActionLoading}
      />

      {/* Reject Confirmation */}
      <ConfirmDialog
        isOpen={!!rejectConfirmRequest}
        onClose={() => setRejectConfirmRequest(null)}
        onConfirm={handleReject}
        title="Reject Purchase Request"
        message={`Are you sure you want to reject Purchase Request "${rejectConfirmRequest?.requestNumber}"?`}
        confirmLabel="Reject Request"
        variant="danger"
        isLoading={isActionLoading}
      />

      {/* Cancel Confirmation */}
      <ConfirmDialog
        isOpen={!!cancelConfirmRequest}
        onClose={() => setCancelConfirmRequest(null)}
        onConfirm={handleCancel}
        title="Cancel Purchase Request"
        message={`Are you sure you want to cancel Purchase Request "${cancelConfirmRequest?.requestNumber}"?`}
        confirmLabel="Cancel Request"
        variant="danger"
        isLoading={isActionLoading}
      />
    </div>
  );
};
