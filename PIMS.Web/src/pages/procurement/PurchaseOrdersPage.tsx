import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileCheck,
  Plus,
  RefreshCw,
  Search,
  Eye,
  Edit2,
  CheckCircle,
  AlertCircle,
  Clock,
  Send,
  Calendar,
  Ban,
  Lock,
} from 'lucide-react';
import { procurementService } from '../../api/procurementService';
import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  PurchaseOrderStatus,
  PURCHASE_ORDER_STATUS_LABELS,
  QuotationStatus,
  type PurchaseOrderResponse,
  type CreatePurchaseOrderDto,
  type UpdatePurchaseOrderDto,
  type QuotationRequestResponse,
  type VendorQuotationResponse,
} from '../../types/procurement';

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

export const PurchaseOrdersPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { hasPermission } = useAuth();
  const canView = hasPermission('PurchaseOrderView');
  const canCreate = hasPermission('PurchaseOrderCreate');
  const canApprove = hasPermission('PurchaseOrderApprove');

  // Query params pre-selection from Quotations page
  const createRfqIdParam = searchParams.get('createRfqId');
  const createVqIdParam = searchParams.get('vendorQuotationId');

  // State
  const [orders, setOrders] = useState<PurchaseOrderResponse[]>([]);
  const [awardedQuotations, setAwardedQuotations] = useState<QuotationRequestResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrderResponse | null>(null);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrderResponse | null>(null);

  // Status Action Dialogs
  const [submitConfirmOrder, setSubmitConfirmOrder] = useState<PurchaseOrderResponse | null>(null);
  const [approveConfirmOrder, setApproveConfirmOrder] = useState<PurchaseOrderResponse | null>(null);
  const [issueConfirmOrder, setIssueConfirmOrder] = useState<PurchaseOrderResponse | null>(null);
  const [cancelConfirmOrder, setCancelConfirmOrder] = useState<PurchaseOrderResponse | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Create Form State
  const [createForm, setCreateForm] = useState<{
    quotationRequestId: number | '';
    vendorQuotationId: number | '';
    orderDate: string;
    expectedDeliveryDate: string;
    notes: string;
  }>({
    quotationRequestId: '',
    vendorQuotationId: '',
    orderDate: getTodayIso(),
    expectedDeliveryDate: getTodayIso(),
    notes: '',
  });

  // Edit Form State
  const [editForm, setEditForm] = useState<{
    expectedDeliveryDate: string;
    notes: string;
  }>({
    expectedDeliveryDate: getTodayIso(),
    notes: '',
  });

  // Selected Quotation for Create
  const selectedRfq = useMemo(() => {
    return awardedQuotations.find((q) => q.id === Number(createForm.quotationRequestId)) || null;
  }, [awardedQuotations, createForm.quotationRequestId]);

  const selectedAwardedBid: VendorQuotationResponse | null = useMemo(() => {
    if (!selectedRfq) return null;
    return selectedRfq.vendorQuotations.find((vq) => vq.isSelected) || null;
  }, [selectedRfq]);

  // Load Data
  const loadData = useCallback(async () => {
    if (!canView) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [orderList, rfqList] = await Promise.all([
        procurementService.getPurchaseOrders(),
        procurementService.getQuotations(),
      ]);
      setOrders(orderList);
      setAwardedQuotations(rfqList.filter((q) => q.status === QuotationStatus.Awarded));
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to load purchase orders.'));
    } finally {
      setIsLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-open create modal if navigated with params
  useEffect(() => {
    if (createRfqIdParam && awardedQuotations.length > 0 && !isCreateModalOpen) {
      const rfq = awardedQuotations.find((q) => q.id === Number(createRfqIdParam));
      if (rfq) {
        const winningBid = rfq.vendorQuotations.find((vq) => vq.isSelected);
        if (winningBid) {
          setCreateForm({
            quotationRequestId: rfq.id,
            vendorQuotationId: winningBid.id,
            orderDate: getTodayIso(),
            expectedDeliveryDate: getTodayIso(),
            notes: `Purchase Order generated from Awarded RFQ ${rfq.quotationNumber}`,
          });
          setIsCreateModalOpen(true);
        }
      }
    }
  }, [createRfqIdParam, createVqIdParam, awardedQuotations, isCreateModalOpen]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'all') {
        if (o.status !== Number(statusFilter)) return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesNum = o.orderNumber.toLowerCase().includes(query);
        const matchesVendor = o.vendorName?.toLowerCase().includes(query) ?? false;
        const matchesNotes = o.notes?.toLowerCase().includes(query) ?? false;
        return matchesNum || matchesVendor || matchesNotes;
      }

      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = orders.length;
    const draft = orders.filter((o) => o.status === PurchaseOrderStatus.Draft).length;
    const pending = orders.filter((o) => o.status === PurchaseOrderStatus.PendingApproval).length;
    const approved = orders.filter((o) => o.status === PurchaseOrderStatus.Approved).length;
    const issued = orders.filter((o) => o.status === PurchaseOrderStatus.Issued).length;
    const received = orders.filter(
      (o) =>
        o.status === PurchaseOrderStatus.PartiallyReceived ||
        o.status === PurchaseOrderStatus.FullyReceived
    ).length;
    return { total, draft, pending, approved, issued, received };
  }, [orders]);

  // Status Badge Helper
  const renderStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case PurchaseOrderStatus.Draft:
        return <span className="badge badge-secondary">Draft</span>;
      case PurchaseOrderStatus.PendingApproval:
        return (
          <span className="badge badge-warning" title="Pending supervisory approval">
            <Clock size={12} /> Pending Approval
          </span>
        );
      case PurchaseOrderStatus.Approved:
        return (
          <span className="badge badge-success" title="Approved, ready for issuance">
            <CheckCircle size={12} /> Approved
          </span>
        );
      case PurchaseOrderStatus.Issued:
        return (
          <span className="badge badge-primary" title="Issued to supplier">
            <Send size={12} /> Issued
          </span>
        );
      case PurchaseOrderStatus.PartiallyReceived:
        return <span className="badge badge-cyan">Partially Received</span>;
      case PurchaseOrderStatus.FullyReceived:
        return <span className="badge badge-success">Fully Received</span>;
      case PurchaseOrderStatus.Cancelled:
        return <span className="badge badge-secondary">Cancelled</span>;
      default:
        return <span className="badge badge-secondary">Unknown</span>;
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    const firstAwarded = awardedQuotations[0];
    const winningBid = firstAwarded?.vendorQuotations.find((vq) => vq.isSelected);

    setCreateForm({
      quotationRequestId: firstAwarded ? firstAwarded.id : '',
      vendorQuotationId: winningBid ? winningBid.id : '',
      orderDate: getTodayIso(),
      expectedDeliveryDate: getTodayIso(),
      notes: '',
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRfq || !selectedAwardedBid) {
      alert('Please select an awarded RFQ with an accepted supplier quotation.');
      return;
    }

    setIsActionLoading(true);
    setErrorMessage(null);

    const payload: CreatePurchaseOrderDto = {
      quotationRequestId: selectedRfq.id,
      vendorQuotationId: selectedAwardedBid.id,
      orderDate: new Date(createForm.orderDate).toISOString(),
      expectedDeliveryDate: new Date(createForm.expectedDeliveryDate).toISOString(),
      notes: createForm.notes.trim() || null,
      items: selectedAwardedBid.items.map((it) => ({
        purchaseRequestItemId: it.purchaseRequestItemId,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        taxPercentage: it.taxPercentage,
        remarks: it.remarks || null,
      })),
    };

    try {
      const created = await procurementService.createPurchaseOrder(payload);
      setSuccessMessage(`Purchase Order "${created.orderNumber}" generated successfully.`);
      setIsCreateModalOpen(false);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to generate purchase order.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (po: PurchaseOrderResponse) => {
    setEditingOrder(po);
    setEditForm({
      expectedDeliveryDate: po.expectedDeliveryDate.split('T')[0],
      notes: po.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    setIsActionLoading(true);
    setErrorMessage(null);

    const payload: UpdatePurchaseOrderDto = {
      expectedDeliveryDate: new Date(editForm.expectedDeliveryDate).toISOString(),
      notes: editForm.notes.trim() || null,
    };

    try {
      await procurementService.updatePurchaseOrder(editingOrder.id, payload);
      setSuccessMessage(`Purchase Order "${editingOrder.orderNumber}" updated.`);
      setIsEditModalOpen(false);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to update purchase order.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Status Action Handlers
  const handleSubmitForApproval = async () => {
    if (!submitConfirmOrder) return;
    setIsActionLoading(true);
    try {
      await procurementService.submitPurchaseOrderForApproval(submitConfirmOrder.id);
      setSuccessMessage(`Purchase Order "${submitConfirmOrder.orderNumber}" submitted for approval.`);
      setSubmitConfirmOrder(null);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to submit order for approval.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleApproveOrder = async () => {
    if (!approveConfirmOrder) return;
    setIsActionLoading(true);
    try {
      await procurementService.approvePurchaseOrder(approveConfirmOrder.id);
      setSuccessMessage(`Purchase Order "${approveConfirmOrder.orderNumber}" approved.`);
      setApproveConfirmOrder(null);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to approve purchase order.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleIssueOrder = async () => {
    if (!issueConfirmOrder) return;
    setIsActionLoading(true);
    try {
      await procurementService.issuePurchaseOrder(issueConfirmOrder.id);
      setSuccessMessage(`Purchase Order "${issueConfirmOrder.orderNumber}" issued to supplier.`);
      setIssueConfirmOrder(null);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to issue purchase order.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelConfirmOrder) return;
    setIsActionLoading(true);
    try {
      await procurementService.cancelPurchaseOrder(cancelConfirmOrder.id);
      setSuccessMessage(`Purchase Order "${cancelConfirmOrder.orderNumber}" cancelled.`);
      setCancelConfirmOrder(null);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to cancel purchase order.'));
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
            You do not have permission to view Purchase Orders.
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
            <FileCheck size={24} />
          </div>
          <div>
            <h1>Purchase Orders (PO)</h1>
            <p className="page-header-subtitle">
              Issue legally binding orders to suppliers, manage delivery schedules, and track fulfillment status.
            </p>
          </div>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadData}
            disabled={isLoading}
            title="Refresh orders"
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
              <span>Generate Purchase Order</span>
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
            Total Orders
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--navy-900)' }}>
            {stats.total}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Draft Orders
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--navy-600)' }}>
            {stats.draft}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Pending Approval
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: '#b45309' }}>
            {stats.pending}
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
            Issued to Supplier
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--blue-600)' }}>
            {stats.issued}
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
              placeholder="Search PO #, supplier, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label htmlFor="po-status-filter" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Status:
            </label>
            <select
              id="po-status-filter"
              className="form-select"
              style={{ width: 'auto', minWidth: '160px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              {Object.entries(PURCHASE_ORDER_STATUS_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card table-container">
        {isLoading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <RefreshCw size={32} className="spin text-muted" style={{ margin: '0 auto 1rem' }} />
            <p className="text-muted">Loading purchase orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <FileCheck size={44} className="text-muted" style={{ margin: '0 auto 1rem', opacity: 0.6 }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--navy-900)' }}>
              No Purchase Orders Found
            </h3>
            <p className="text-muted" style={{ maxWidth: 420, margin: '0.5rem auto 1.25rem' }}>
              {searchQuery || statusFilter !== 'all'
                ? 'No purchase orders match your filter criteria.'
                : 'No purchase orders have been created yet. Ensure an RFQ with an awarded vendor bid exists to generate a PO.'}
            </p>
            {canCreate && awardedQuotations.length > 0 && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenCreate}
              >
                <Plus size={16} />
                <span>Generate Purchase Order</span>
              </button>
            )}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '170px' }}>Order Number</th>
                <th>Supplier</th>
                <th>Order Date</th>
                <th>Expected Delivery</th>
                <th style={{ textAlign: 'right' }}>Total (PKR)</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'right', width: '220px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <span className="code-badge">{order.orderNumber}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>
                      {order.vendorName || '—'}
                    </div>
                    {order.notes && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {order.notes}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8125rem' }}>{formatDate(order.orderDate)}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem' }}>
                      <Calendar size={13} className="text-muted" />
                      <span>{formatDate(order.expectedDeliveryDate)}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--navy-900)', fontSize: '0.9375rem' }}>
                    PKR {Number(order.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {renderStatusBadge(order.status)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      {/* View Details */}
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        title="View Purchase Order Details"
                        onClick={() => setViewingOrder(order)}
                      >
                        <Eye size={15} />
                      </button>

                      {/* Edit (Draft only) */}
                      {order.status === PurchaseOrderStatus.Draft && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          title="Edit Order Delivery &amp; Notes"
                          onClick={() => handleOpenEdit(order)}
                        >
                          <Edit2 size={15} />
                        </button>
                      )}

                      {/* Submit For Approval (Draft only) */}
                      {order.status === PurchaseOrderStatus.Draft && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--blue-600)' }}
                          title="Submit PO for Approval"
                          onClick={() => setSubmitConfirmOrder(order)}
                        >
                          <Send size={15} />
                        </button>
                      )}

                      {/* Approve (PendingApproval only) */}
                      {canApprove && order.status === PurchaseOrderStatus.PendingApproval && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--accent-emerald)' }}
                          title="Approve Purchase Order"
                          onClick={() => setApproveConfirmOrder(order)}
                        >
                          <CheckCircle size={15} />
                        </button>
                      )}

                      {/* Issue (Approved only) */}
                      {order.status === PurchaseOrderStatus.Approved && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--blue-600)' }}
                          title="Issue PO to Vendor"
                          onClick={() => setIssueConfirmOrder(order)}
                        >
                          <Send size={15} />
                        </button>
                      )}

                      {/* Cancel (Draft, PendingApproval, Approved) */}
                      {(order.status === PurchaseOrderStatus.Draft ||
                        order.status === PurchaseOrderStatus.PendingApproval ||
                        order.status === PurchaseOrderStatus.Approved) && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--accent-rose)' }}
                          title="Cancel Purchase Order"
                          onClick={() => setCancelConfirmOrder(order)}
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
          Generate Purchase Order Modal
          ========================================================================= */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        size="lg"
        title="Generate Purchase Order"
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
              disabled={isActionLoading || !selectedRfq || !selectedAwardedBid}
            >
              {isActionLoading ? 'Generating...' : 'Create Draft PO'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} noValidate>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            {/* Source Awarded RFQ Selection */}
            <div style={{ gridColumn: 'span 2' }}>
              <label htmlFor="po-create-rfq" className="form-label required">Source Awarded RFQ &amp; Supplier Bid</label>
              {awardedQuotations.length === 0 ? (
                <div className="alert alert-warning" style={{ fontSize: '0.8125rem' }}>
                  No awarded quotation requests currently exist. To generate a Purchase Order, you must
                  first conduct an RFQ and award a supplier bid.
                </div>
              ) : (
                <select
                  id="po-create-rfq"
                  className="form-select"
                  value={createForm.quotationRequestId ? String(createForm.quotationRequestId) : ''}
                  onChange={(e) => {
                    const rfqId = e.target.value === '' ? '' : Number(e.target.value);
                    const rfq = awardedQuotations.find((q) => q.id === rfqId);
                    const winningBid = rfq?.vendorQuotations.find((vq) => vq.isSelected);
                    setCreateForm({
                      ...createForm,
                      quotationRequestId: rfqId,
                      vendorQuotationId: winningBid ? winningBid.id : '',
                    });
                  }}
                  required
                >
                  <option value="">Select Awarded RFQ</option>
                  {awardedQuotations.map((q) => {
                    const winningBid = q.vendorQuotations.find((vq) => vq.isSelected);
                    return (
                      <option key={q.id} value={q.id}>
                        [{q.quotationNumber}] Awarded to {winningBid?.vendorName || 'Selected Supplier'} (PKR {Number(winningBid?.totalAmount || 0).toLocaleString()})
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            {/* Supplier Preview Banner */}
            {selectedAwardedBid && (
              <div
                style={{
                  gridColumn: 'span 2',
                  background: 'var(--bg-surface-subtle)',
                  padding: '0.875rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Contracted Supplier
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--navy-900)', fontSize: '1rem' }}>
                    {selectedAwardedBid.vendorName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Quotation Ref: {selectedAwardedBid.vendorQuotationNumber}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Total Contract Amount
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--navy-900)', fontSize: '1.125rem' }}>
                    PKR {Number(selectedAwardedBid.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            )}

            {/* Order Date */}
            <div>
              <label htmlFor="po-create-date" className="form-label required">Order Issuance Date</label>
              <input
                id="po-create-date"
                type="date"
                className="form-input"
                value={createForm.orderDate}
                onChange={(e) => setCreateForm({ ...createForm, orderDate: e.target.value })}
                required
              />
            </div>

            {/* Expected Delivery Date */}
            <div>
              <label htmlFor="po-create-delivery" className="form-label required">Expected Delivery Date</label>
              <input
                id="po-create-delivery"
                type="date"
                className="form-input"
                value={createForm.expectedDeliveryDate}
                onChange={(e) => setCreateForm({ ...createForm, expectedDeliveryDate: e.target.value })}
                required
              />
            </div>

            {/* Notes */}
            <div style={{ gridColumn: 'span 2' }}>
              <label htmlFor="po-create-notes" className="form-label">Delivery Instructions &amp; Contract Notes</label>
              <textarea
                id="po-create-notes"
                className="form-textarea"
                rows={2}
                placeholder="Consignment address, receiving bay, inspection terms..."
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              />
            </div>
          </div>

          {/* Quoted Items Breakdown */}
          {selectedAwardedBid && (
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--navy-900)', marginBottom: '0.5rem' }}>
                Contract Items to be Ordered ({selectedAwardedBid.items.length})
              </h4>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th style={{ textAlign: 'center' }}>Quantity</th>
                    <th style={{ textAlign: 'right' }}>Agreed Unit Price</th>
                    <th style={{ textAlign: 'center' }}>Tax %</th>
                    <th style={{ textAlign: 'right' }}>Line Total (PKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedAwardedBid.items.map((it) => (
                    <tr key={it.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{it.itemName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{it.itemCode}</div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{it.quantity}</td>
                      <td style={{ textAlign: 'right' }}>
                        {Number(it.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'center' }}>{it.taxPercentage}%</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {Number(it.lineTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </form>
      </Modal>

      {/* =========================================================================
          Edit Purchase Order Modal (Draft only)
          ========================================================================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        size="md"
        title={editingOrder ? `Edit Draft PO: ${editingOrder.orderNumber}` : 'Edit Order'}
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
              {isActionLoading ? 'Saving...' : 'Update Order'}
            </button>
          </>
        }
      >
        <form onSubmit={handleEditSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label htmlFor="po-edit-delivery" className="form-label required">Expected Delivery Date</label>
              <input
                id="po-edit-delivery"
                type="date"
                className="form-input"
                value={editForm.expectedDeliveryDate}
                onChange={(e) => setEditForm({ ...editForm, expectedDeliveryDate: e.target.value })}
                required
              />
            </div>

            <div>
              <label htmlFor="po-edit-notes" className="form-label">Delivery Instructions &amp; Notes</label>
              <textarea
                id="po-edit-notes"
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
          View Purchase Order Details Modal
          ========================================================================= */}
      <Modal
        isOpen={!!viewingOrder}
        onClose={() => setViewingOrder(null)}
        size="lg"
        title={
          viewingOrder ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="code-badge">{viewingOrder.orderNumber}</span>
              <span>Purchase Order Details</span>
            </div>
          ) : (
            'PO Details'
          )
        }
        footer={
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setViewingOrder(null)}
          >
            Close
          </button>
        }
      >
        {viewingOrder && (
          <div>
            <div className="detail-grid" style={{ marginBottom: '1.25rem' }}>
              <div className="detail-item">
                <div className="detail-label">Order Number</div>
                <div className="detail-value"><span className="code-badge">{viewingOrder.orderNumber}</span></div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Status</div>
                <div className="detail-value">{renderStatusBadge(viewingOrder.status)}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Contracted Supplier</div>
                <div className="detail-value">{viewingOrder.vendorName || '—'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Order Date</div>
                <div className="detail-value">{formatDate(viewingOrder.orderDate)}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Expected Delivery Date</div>
                <div className="detail-value">{formatDate(viewingOrder.expectedDeliveryDate)}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Grand Total Amount</div>
                <div className="detail-value" style={{ fontWeight: 700, color: 'var(--navy-900)' }}>
                  PKR {Number(viewingOrder.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
              {viewingOrder.notes && (
                <div className="detail-item full-width">
                  <div className="detail-label">Delivery Notes &amp; Terms</div>
                  <div className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>
                    {viewingOrder.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--navy-900)', marginBottom: '0.5rem' }}>
                Ordered Line Items
              </h4>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th style={{ textAlign: 'center' }}>Quantity</th>
                    <th style={{ textAlign: 'right' }}>Unit Price (PKR)</th>
                    <th style={{ textAlign: 'center' }}>Tax %</th>
                    <th style={{ textAlign: 'right' }}>Line Subtotal</th>
                    <th style={{ textAlign: 'right' }}>Line Total (PKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingOrder.items.map((it) => (
                    <tr key={it.id}>
                      <td style={{ fontWeight: 600 }}>{it.itemName || `Item #${it.itemId}`}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{it.quantity}</td>
                      <td style={{ textAlign: 'right' }}>
                        {Number(it.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'center' }}>{it.taxPercentage}%</td>
                      <td style={{ textAlign: 'right' }}>
                        {Number(it.lineSubtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {Number(it.lineTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'right', fontWeight: 600 }}>Subtotal:</td>
                    <td colSpan={2} style={{ textAlign: 'right', fontWeight: 600 }}>
                      PKR {Number(viewingOrder.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'right', fontWeight: 600 }}>Sales Tax:</td>
                    <td colSpan={2} style={{ textAlign: 'right', fontWeight: 600 }}>
                      PKR {Number(viewingOrder.taxAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr style={{ background: 'var(--bg-surface-subtle)' }}>
                    <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.9375rem' }}>Grand Total:</td>
                    <td colSpan={2} style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--navy-900)' }}>
                      PKR {Number(viewingOrder.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* =========================================================================
          Confirmation Dialogs
          ========================================================================= */}
      {/* Submit for Approval Confirmation */}
      <ConfirmDialog
        isOpen={!!submitConfirmOrder}
        onClose={() => setSubmitConfirmOrder(null)}
        onConfirm={handleSubmitForApproval}
        title="Submit PO for Approval"
        message={`Submit Purchase Order "${submitConfirmOrder?.orderNumber}" for supervisory approval?`}
        confirmLabel="Submit for Approval"
        variant="warning"
        isLoading={isActionLoading}
      />

      {/* Approve Confirmation */}
      <ConfirmDialog
        isOpen={!!approveConfirmOrder}
        onClose={() => setApproveConfirmOrder(null)}
        onConfirm={handleApproveOrder}
        title="Approve Purchase Order"
        message={`Approve Purchase Order "${approveConfirmOrder?.orderNumber}"? Once approved, it can be formally issued to ${approveConfirmOrder?.vendorName}.`}
        confirmLabel="Approve PO"
        variant="success"
        isLoading={isActionLoading}
      />

      {/* Issue Confirmation */}
      <ConfirmDialog
        isOpen={!!issueConfirmOrder}
        onClose={() => setIssueConfirmOrder(null)}
        onConfirm={handleIssueOrder}
        title="Issue Purchase Order"
        message={`Formally issue Purchase Order "${issueConfirmOrder?.orderNumber}" to supplier "${issueConfirmOrder?.vendorName}"? This creates a binding delivery contract.`}
        confirmLabel="Issue Order"
        variant="success"
        isLoading={isActionLoading}
      />

      {/* Cancel Confirmation */}
      <ConfirmDialog
        isOpen={!!cancelConfirmOrder}
        onClose={() => setCancelConfirmOrder(null)}
        onConfirm={handleCancelOrder}
        title="Cancel Purchase Order"
        message={`Are you sure you want to cancel Purchase Order "${cancelConfirmOrder?.orderNumber}"?`}
        confirmLabel="Cancel PO"
        variant="danger"
        isLoading={isActionLoading}
      />
    </div>
  );
};
