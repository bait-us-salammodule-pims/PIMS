import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  DollarSign,
  Plus,
  RefreshCw,
  Search,
  Edit2,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  Lock,
  Calendar,
  Package,
} from 'lucide-react';
import { itemService } from '../../api/itemService';
import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import type {
  ItemPricing,
  Item,
  ItemPricingFormData,
  CreateItemPricingRequest,
  UpdateItemPricingRequest,
} from '../../types/item';

function getTodayIso(): string {
  return new Date().toISOString().split('T')[0];
}

function checkIsCurrentlyEffective(pricing: ItemPricing): boolean {
  if (!pricing.isActive) return false;
  const now = new Date();
  const from = new Date(pricing.effectiveFrom);
  if (from > now) return false;
  if (pricing.effectiveTo) {
    const to = new Date(pricing.effectiveTo);
    to.setHours(23, 59, 59, 999);
    if (to < now) return false;
  }
  return true;
}

export const ItemPricingPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canView = hasPermission('ItemView');
  const canCreate = hasPermission('ItemCreate');
  const canUpdate = hasPermission('ItemUpdate');
  const canDeactivate = hasPermission('ItemDeactivate');

  // State
  const [pricings, setPricings] = useState<ItemPricing[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [selectedItemFilter, setSelectedItemFilter] = useState<number | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemPricing | null>(null);
  const [viewingItem, setViewingItem] = useState<ItemPricing | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<ItemPricing | null>(null);
  const [toggleConfirmItem, setToggleConfirmItem] = useState<ItemPricing | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields & Validation
  const [formData, setFormData] = useState<ItemPricingFormData>(() => ({
    itemId: '',
    unitPrice: '',
    currencyCode: 'PKR',
    effectiveFrom: getTodayIso(),
    effectiveTo: '',
    isActive: true,
  }));
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Load Data
  const loadData = useCallback(async () => {
    if (!canView) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [pricingData, itemsData] = await Promise.all([
        itemService.getItemPricings(
          typeof selectedItemFilter === 'number' && selectedItemFilter > 0
            ? selectedItemFilter
            : undefined
        ),
        itemService.getItems(),
      ]);
      setPricings(pricingData);
      setItems(itemsData);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to load item pricing schedules.'));
    } finally {
      setIsLoading(false);
    }
  }, [canView, selectedItemFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered Pricing Schedules
  const filteredPricings = useMemo(() => {
    return pricings.filter((p) => {
      if (!includeInactive && !p.isActive) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = p.itemName.toLowerCase().includes(query);
        const matchesCode = p.itemCode.toLowerCase().includes(query);
        const matchesCurrency = p.currencyCode.toLowerCase().includes(query);
        const matchesPrice = p.unitPrice.toString().includes(query);
        return matchesName || matchesCode || matchesCurrency || matchesPrice;
      }

      return true;
    });
  }, [pricings, includeInactive, searchQuery]);

  // Form Handlers
  const handleOpenCreate = () => {
    setEditingItem(null);
    const firstActiveItem = items.find((i) => i.isActive);
    setFormData({
      itemId: firstActiveItem ? firstActiveItem.id : '',
      unitPrice: '',
      currencyCode: 'PKR',
      effectiveFrom: getTodayIso(),
      effectiveTo: '',
      isActive: true,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: ItemPricing) => {
    setEditingItem(item);
    setFormData({
      itemId: item.itemId,
      unitPrice: item.unitPrice,
      currencyCode: item.currencyCode,
      effectiveFrom: item.effectiveFrom ? item.effectiveFrom.split('T')[0] : '',
      effectiveTo: item.effectiveTo ? item.effectiveTo.split('T')[0] : '',
      isActive: item.isActive,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!editingItem && (!formData.itemId || typeof formData.itemId !== 'number' || formData.itemId <= 0)) {
      errors.itemId = 'Please select a catalog item.';
    }

    if (formData.unitPrice === '' || formData.unitPrice === null || isNaN(Number(formData.unitPrice))) {
      errors.unitPrice = 'Unit price is required and must be a valid number.';
    } else if (Number(formData.unitPrice) < 0) {
      errors.unitPrice = 'Unit price cannot be negative.';
    } else if (Number(formData.unitPrice) > 999999999999.99) {
      errors.unitPrice = 'Unit price exceeds maximum limit.';
    }

    if (!formData.currencyCode.trim()) {
      errors.currencyCode = 'Currency code is required.';
    } else if (formData.currencyCode.trim().length !== 3) {
      errors.currencyCode = 'Currency code must be exactly 3 characters (e.g. PKR, USD).';
    }

    if (!formData.effectiveFrom) {
      errors.effectiveFrom = 'Effective from date is required.';
    }

    if (formData.effectiveTo && formData.effectiveFrom) {
      if (new Date(formData.effectiveTo) < new Date(formData.effectiveFrom)) {
        errors.effectiveTo = 'Effective to date cannot be earlier than effective from date.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const unitPriceNum = Number(formData.unitPrice);
    const currency = formData.currencyCode.trim().toUpperCase();
    // Convert YYYY-MM-DD to ISO 8601 UTC
    const effectiveFromIso = new Date(formData.effectiveFrom).toISOString();
    const effectiveToIso = formData.effectiveTo ? new Date(formData.effectiveTo).toISOString() : null;

    try {
      if (editingItem) {
        const updatePayload: UpdateItemPricingRequest = {
          unitPrice: unitPriceNum,
          currencyCode: currency,
          effectiveFrom: effectiveFromIso,
          effectiveTo: effectiveToIso,
          isActive: formData.isActive,
        };
        const updated = await itemService.updateItemPricing(editingItem.id, updatePayload);
        setPricings((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        setSuccessMessage(`Pricing schedule #${updated.id} updated successfully.`);
      } else {
        const createPayload: CreateItemPricingRequest = {
          itemId: Number(formData.itemId),
          unitPrice: unitPriceNum,
          currencyCode: currency,
          effectiveFrom: effectiveFromIso,
          effectiveTo: effectiveToIso,
        };
        const created = await itemService.createItemPricing(createPayload);
        setPricings((prev) => [created, ...prev]);
        setSuccessMessage(`Pricing schedule created for "${created.itemName}".`);
      }
      setIsFormOpen(false);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to save item pricing schedule.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Active/Inactive Status
  const handleToggleStatus = async () => {
    if (!toggleConfirmItem) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const updated = await itemService.updateItemPricing(toggleConfirmItem.id, {
        unitPrice: toggleConfirmItem.unitPrice,
        currencyCode: toggleConfirmItem.currencyCode,
        effectiveFrom: toggleConfirmItem.effectiveFrom,
        effectiveTo: toggleConfirmItem.effectiveTo,
        isActive: !toggleConfirmItem.isActive,
      });
      setPricings((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setSuccessMessage(
        `Pricing schedule #${updated.id} has been ${updated.isActive ? 'activated' : 'deactivated'}.`
      );
      setToggleConfirmItem(null);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to update pricing status.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Pricing
  const handleDelete = async () => {
    if (!deleteConfirmItem) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await itemService.deleteItemPricing(deleteConfirmItem.id);
      setPricings((prev) => prev.filter((p) => p.id !== deleteConfirmItem.id));
      setSuccessMessage(`Pricing schedule #${deleteConfirmItem.id} deleted successfully.`);
      setDeleteConfirmItem(null);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to delete item pricing.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canView) {
    return (
      <div className="empty-state-card" style={{ margin: '2rem auto', maxWidth: '500px' }}>
        <div className="empty-state-icon" style={{ color: 'var(--danger-500)' }}>
          <Lock size={32} />
        </div>
        <div className="empty-state-title">Access Restricted</div>
        <div className="empty-state-desc">
          You do not have the required permission (<code>ItemView</code>) to view Item Pricing Schedules.
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-pretitle">Items &amp; Catalog</div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <DollarSign size={26} className="text-primary" />
            <span>Item Pricing Schedules</span>
          </h1>
          <p className="page-description">
            Standard valuation and purchase pricing with effective date windows and multi-currency support.
          </p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadData}
            disabled={isLoading}
            title="Refresh item pricing"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {canCreate && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenCreate}
            >
              <Plus size={16} />
              <span>Add Price Schedule</span>
            </button>
          )}
        </div>
      </div>

      {/* Alert Messages */}
      {successMessage && (
        <div className="alert-box alert-success" style={{ marginBottom: '1.25rem' }}>
          <CheckCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>{successMessage}</div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            style={{ color: '#065f46', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="alert-box alert-error" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>{errorMessage}</div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            style={{ color: '#b91c1c', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Card */}
      <div className="filter-card">
        <div className="filter-controls-group">
          {/* Item Filter Dropdown */}
          <select
            className="filter-select"
            value={selectedItemFilter}
            onChange={(e) =>
              setSelectedItemFilter(e.target.value === '' ? '' : Number(e.target.value))
            }
            title="Filter by Item"
          >
            <option value="">All Catalog Items</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.itemCode}) {!item.isActive ? '[Inactive]' : ''}
              </option>
            ))}
          </select>

          {/* Search Input */}
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by item name, SKU, price, currency..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <label className="filter-checkbox-label">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
            />
            <span>Show Inactive Schedules</span>
          </label>
        </div>

        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Showing <strong>{filteredPricings.length}</strong> of <strong>{pricings.length}</strong> price schedules
        </div>
      </div>

      {/* Data Table */}
      <div className="data-table-container">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Item Code</th>
                <th>Item Name</th>
                <th style={{ width: '150px' }}>Unit Price</th>
                <th style={{ width: '120px' }}>Effective From</th>
                <th style={{ width: '120px' }}>Effective To</th>
                <th style={{ width: '110px' }}>Status</th>
                <th style={{ width: '140px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Loading item pricing schedules...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPricings.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="table-empty-state">
                      <div className="empty-state-icon">
                        <DollarSign size={28} />
                      </div>
                      <div className="empty-state-title">No Pricing Schedules Found</div>
                      <div className="empty-state-desc">
                        {searchQuery || selectedItemFilter !== ''
                          ? 'No price schedules match your search or item filter.'
                          : 'No pricing schedules have been established yet.'}
                      </div>
                      {canCreate && !searchQuery && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={handleOpenCreate}
                        >
                          <Plus size={15} />
                          <span>Establish First Price</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPricings.map((p) => {
                  const currentlyActive = checkIsCurrentlyEffective(p);

                  return (
                    <tr key={p.id} className={!p.isActive ? 'row-inactive' : ''}>
                      <td>
                        <span className="code-badge">{p.itemCode}</span>
                      </td>
                      <td>
                        <span className="record-name-text">{p.itemName}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--navy-600)' }}>
                            {p.currencyCode}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--navy-900)' }}>
                            {Number(p.unitPrice).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8125rem', color: 'var(--navy-800)' }}>
                          <Calendar size={13} className="text-muted" />
                          <span>{new Date(p.effectiveFrom).toLocaleDateString()}</span>
                        </span>
                      </td>
                      <td>
                        {p.effectiveTo ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8125rem', color: 'var(--navy-800)' }}>
                            <Calendar size={13} className="text-muted" />
                            <span>{new Date(p.effectiveTo).toLocaleDateString()}</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              color: 'var(--primary-700)',
                              backgroundColor: 'var(--primary-50)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            Open-ended
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span
                            className={`badge ${p.isActive ? 'badge-success' : 'badge-inactive'}`}
                          >
                            {p.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {currentlyActive && (
                            <span
                              style={{
                                fontSize: '0.6875rem',
                                color: '#047857',
                                fontWeight: 600,
                              }}
                            >
                              ● Effective Now
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            gap: '0.35rem',
                            justifyContent: 'flex-end',
                          }}
                        >
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => setViewingItem(p)}
                            title="View pricing details"
                          >
                            <Eye size={15} />
                          </button>

                          {canUpdate && (
                            <button
                              type="button"
                              className="btn-icon"
                              onClick={() => handleOpenEdit(p)}
                              title="Edit price schedule"
                            >
                              <Edit2 size={15} />
                            </button>
                          )}

                          {canDeactivate && (
                            <button
                              type="button"
                              className={`btn-icon ${
                                p.isActive ? 'text-warning' : 'text-success'
                              }`}
                              onClick={() => setToggleConfirmItem(p)}
                              title={p.isActive ? 'Deactivate schedule' : 'Activate schedule'}
                            >
                              {p.isActive ? <XCircle size={15} /> : <CheckCircle size={15} />}
                            </button>
                          )}

                          {canDeactivate && (
                            <button
                              type="button"
                              className="btn-icon text-danger"
                              onClick={() => setDeleteConfirmItem(p)}
                              title="Delete price schedule"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingItem ? `Edit Price Schedule: ${editingItem.itemName}` : 'Establish Item Pricing'}
        size="md"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsFormOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : editingItem ? 'Update Pricing' : 'Save Pricing'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          {!editingItem ? (
            <div className="form-group">
              <label className="form-label required">Target Item</label>
              <select
                className={`form-select ${formErrors.itemId ? 'is-invalid' : ''}`}
                value={formData.itemId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    itemId: e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
              >
                <option value="">Select Item from Catalog...</option>
                {items
                  .filter((i) => i.isActive)
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.itemCode})
                    </option>
                  ))}
              </select>
              {formErrors.itemId && (
                <div className="form-feedback-error">{formErrors.itemId}</div>
              )}
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Target Item</label>
              <div
                style={{
                  padding: '0.625rem 0.75rem',
                  backgroundColor: 'var(--gray-100)',
                  borderRadius: 'var(--border-radius)',
                  color: 'var(--navy-900)',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Package size={16} className="text-muted" />
                <span>
                  {editingItem.itemName} ({editingItem.itemCode})
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Item reference cannot be altered for an existing price record.
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label required">Unit Price</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={`form-input ${formErrors.unitPrice ? 'is-invalid' : ''}`}
                placeholder="0.00"
                value={formData.unitPrice}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    unitPrice: e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
              />
              {formErrors.unitPrice && (
                <div className="form-feedback-error">{formErrors.unitPrice}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label required">Currency</label>
              <input
                type="text"
                className={`form-input ${formErrors.currencyCode ? 'is-invalid' : ''}`}
                placeholder="e.g. PKR, USD, EUR"
                value={formData.currencyCode}
                onChange={(e) =>
                  setFormData({ ...formData, currencyCode: e.target.value.toUpperCase() })
                }
                maxLength={3}
              />
              {formErrors.currencyCode && (
                <div className="form-feedback-error">{formErrors.currencyCode}</div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label required">Effective From</label>
              <input
                type="date"
                className={`form-input ${formErrors.effectiveFrom ? 'is-invalid' : ''}`}
                value={formData.effectiveFrom}
                onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
              />
              {formErrors.effectiveFrom && (
                <div className="form-feedback-error">{formErrors.effectiveFrom}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Effective To</label>
              <input
                type="date"
                className={`form-input ${formErrors.effectiveTo ? 'is-invalid' : ''}`}
                value={formData.effectiveTo}
                onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
              />
              {formErrors.effectiveTo && (
                <div className="form-feedback-error">{formErrors.effectiveTo}</div>
              )}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Leave empty for open-ended price.
              </div>
            </div>
          </div>

          {editingItem && (
            <div className="form-group" style={{ marginTop: '0.5rem' }}>
              <label className="filter-checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <span>Active Status (Active pricing is subject to interval overlap checks)</span>
              </label>
            </div>
          )}
        </form>
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={!!viewingItem}
        onClose={() => setViewingItem(null)}
        title="Price Schedule Details"
        size="md"
        footer={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setViewingItem(null)}
          >
            Close
          </button>
        }
      >
        {viewingItem && (
          <div className="details-grid">
            <div className="details-item">
              <span className="details-label">Schedule ID</span>
              <span className="details-value">#{viewingItem.id}</span>
            </div>
            <div className="details-item">
              <span className="details-label">Status</span>
              <span className="details-value">
                <span className={`badge ${viewingItem.isActive ? 'badge-success' : 'badge-inactive'}`}>
                  {viewingItem.isActive ? 'Active' : 'Inactive'}
                </span>
              </span>
            </div>
            <div className="details-item">
              <span className="details-label">Item Code</span>
              <span className="details-value">
                <span className="code-badge">{viewingItem.itemCode}</span>
              </span>
            </div>
            <div className="details-item">
              <span className="details-label">Item Name</span>
              <span className="details-value font-medium">{viewingItem.itemName}</span>
            </div>
            <div className="details-item">
              <span className="details-label">Unit Price</span>
              <span className="details-value font-bold" style={{ color: 'var(--navy-900)' }}>
                {viewingItem.currencyCode}{' '}
                {Number(viewingItem.unitPrice).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="details-item">
              <span className="details-label">Currency</span>
              <span className="details-value">{viewingItem.currencyCode}</span>
            </div>
            <div className="details-item">
              <span className="details-label">Effective From</span>
              <span className="details-value">
                {new Date(viewingItem.effectiveFrom).toLocaleDateString()}
              </span>
            </div>
            <div className="details-item">
              <span className="details-label">Effective To</span>
              <span className="details-value">
                {viewingItem.effectiveTo
                  ? new Date(viewingItem.effectiveTo).toLocaleDateString()
                  : 'Open-ended (No expiry)'}
              </span>
            </div>
            <div className="details-item">
              <span className="details-label">Created At</span>
              <span className="details-value">
                {new Date(viewingItem.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="details-item">
              <span className="details-label">Last Updated</span>
              <span className="details-value">
                {viewingItem.updatedAt ? new Date(viewingItem.updatedAt).toLocaleString() : '—'}
              </span>
            </div>
          </div>
        )}
      </Modal>

      {/* Toggle Status Confirmation */}
      <ConfirmDialog
        isOpen={!!toggleConfirmItem}
        onClose={() => setToggleConfirmItem(null)}
        onConfirm={handleToggleStatus}
        title={toggleConfirmItem?.isActive ? 'Deactivate Price Schedule' : 'Activate Price Schedule'}
        message={`Are you sure you want to ${
          toggleConfirmItem?.isActive ? 'deactivate' : 'activate'
        } price schedule #${toggleConfirmItem?.id} (${toggleConfirmItem?.currencyCode} ${toggleConfirmItem?.unitPrice} for ${toggleConfirmItem?.itemName})?`}
        confirmLabel={toggleConfirmItem?.isActive ? 'Deactivate' : 'Activate'}
        variant={toggleConfirmItem?.isActive ? 'warning' : 'success'}
        isLoading={isSubmitting}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirmItem}
        onClose={() => setDeleteConfirmItem(null)}
        onConfirm={handleDelete}
        title="Delete Price Schedule"
        message={`Are you sure you want to permanently delete price schedule #${deleteConfirmItem?.id} for "${deleteConfirmItem?.itemName}"? This cannot be undone.`}
        confirmLabel="Delete Permanently"
        variant="danger"
        isLoading={isSubmitting}
      />
    </div>
  );
};
