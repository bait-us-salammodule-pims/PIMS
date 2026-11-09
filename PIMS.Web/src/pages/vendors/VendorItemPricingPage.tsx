import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  DollarSign,
  Plus,
  RefreshCw,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Lock,
  ArrowLeft,
  Calendar,
  Package,
  Truck,
  Users,
} from 'lucide-react';
import { vendorService } from '../../api/vendorService';
import { itemService } from '../../api/itemService';
import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  VendorApprovalStatus,
  VENDOR_APPROVAL_STATUS_LABELS,
  type Vendor,
  type VendorItemPrice,
  type VendorItemPriceFormData,
  type CreateVendorItemPriceRequest,
  type UpdateVendorItemPriceRequest,
} from '../../types/vendor';
import type { Item } from '../../types/item';

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

export const VendorItemPricingPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canView = hasPermission('VendorView');
  const canCreate = hasPermission('VendorCreate');
  const canUpdate = hasPermission('VendorUpdate');
  const canDeactivate = hasPermission('VendorDeactivate');

  // Selected Vendor ID from URL query params
  const rawVendorId = searchParams.get('vendorId');
  const selectedVendorId = rawVendorId ? Number(rawVendorId) : null;

  // State
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [prices, setPrices] = useState<VendorItemPrice[]>([]);
  const [isLoadingVendors, setIsLoadingVendors] = useState(true);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('active');

  // Modals & Actions
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<VendorItemPrice | null>(null);
  const [deactivateConfirmPrice, setDeactivateConfirmPrice] = useState<VendorItemPrice | null>(null);
  const [activateConfirmPrice, setActivateConfirmPrice] = useState<VendorItemPrice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields & Validation
  const [formData, setFormData] = useState<VendorItemPriceFormData>({
    itemId: '',
    unitPrice: '',
    currencyCode: 'PKR',
    minimumOrderQuantity: 1,
    effectiveFrom: getTodayIso(),
    effectiveTo: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Current Vendor Object
  const selectedVendor = useMemo(() => {
    return vendors.find((v) => v.id === selectedVendorId) || null;
  }, [vendors, selectedVendorId]);

  // Vendor Qualification Check (Backend Rule: Only active and approved vendors can have pricing)
  const isVendorEligible = useMemo(() => {
    if (!selectedVendor) return false;
    return selectedVendor.isActive && selectedVendor.approvalStatus === VendorApprovalStatus.Approved;
  }, [selectedVendor]);

  // Load Vendors and Items List
  const loadDependencies = useCallback(async () => {
    if (!canView) return;
    setIsLoadingVendors(true);
    try {
      const [vendorsData, itemsData] = await Promise.all([
        vendorService.getVendors(),
        itemService.getItems(),
      ]);
      setVendors(vendorsData);
      setItems(itemsData);

      // Auto-select first approved vendor or first vendor if none selected
      if (!selectedVendorId && vendorsData.length > 0) {
        const approvedVendor = vendorsData.find(
          (v) => v.approvalStatus === VendorApprovalStatus.Approved && v.isActive
        );
        const defaultVendor = approvedVendor || vendorsData[0];
        setSearchParams({ vendorId: String(defaultVendor.id) });
      }
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to load vendors and catalog items.'));
    } finally {
      setIsLoadingVendors(false);
    }
  }, [canView, selectedVendorId, setSearchParams]);

  useEffect(() => {
    loadDependencies();
  }, [loadDependencies]);

  // Load Item Prices for Selected Vendor
  const loadPrices = useCallback(async (vendorId: number) => {
    if (!canView || !vendorId) return;
    setIsLoadingPrices(true);
    setErrorMessage(null);
    try {
      const data = await vendorService.getItemPrices(vendorId);
      setPrices(data);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to load vendor contract pricing.'));
    } finally {
      setIsLoadingPrices(false);
    }
  }, [canView]);

  useEffect(() => {
    if (selectedVendorId) {
      loadPrices(selectedVendorId);
    } else {
      setPrices([]);
    }
  }, [selectedVendorId, loadPrices]);

  // Handle Vendor Selection Change
  const handleVendorChange = (newVendorId: string) => {
    if (newVendorId) {
      setSearchParams({ vendorId: newVendorId });
    } else {
      setSearchParams({});
    }
    setSearchQuery('');
  };

  // Filtered Pricing Records
  const filteredPrices = useMemo(() => {
    return prices.filter((p) => {
      // Active filter
      if (activeFilter === 'active' && !p.isActive) return false;
      if (activeFilter === 'inactive' && p.isActive) return false;

      // Search Query
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
  }, [prices, activeFilter, searchQuery]);

  // Calculate Effectiveness Status
  const getEffectivenessBadge = (p: VendorItemPrice) => {
    if (!p.isActive) {
      return <span className="badge badge-secondary">Inactive</span>;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const from = new Date(p.effectiveFrom);
    from.setHours(0, 0, 0, 0);

    if (from > today) {
      return (
        <span className="badge badge-cyan" title={`Effective from ${formatDate(p.effectiveFrom)}`}>
          Upcoming
        </span>
      );
    }

    if (p.effectiveTo) {
      const to = new Date(p.effectiveTo);
      to.setHours(23, 59, 59, 999);
      if (to < today) {
        return (
          <span className="badge badge-warning" title={`Expired on ${formatDate(p.effectiveTo)}`}>
            Expired
          </span>
        );
      }
    }

    return (
      <span className="badge badge-success" title="Currently active &amp; effective">
        Effective Now
      </span>
    );
  };

  // Form Handlers
  const handleOpenCreate = () => {
    setEditingPrice(null);
    const firstActiveItem = items.find((i) => i.isActive);
    setFormData({
      itemId: firstActiveItem ? firstActiveItem.id : '',
      unitPrice: '',
      currencyCode: 'PKR',
      minimumOrderQuantity: 1,
      effectiveFrom: getTodayIso(),
      effectiveTo: '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (price: VendorItemPrice) => {
    setEditingPrice(price);
    setFormData({
      itemId: price.itemId,
      unitPrice: price.unitPrice,
      currencyCode: price.currencyCode,
      minimumOrderQuantity: price.minimumOrderQuantity,
      effectiveFrom: price.effectiveFrom ? price.effectiveFrom.split('T')[0] : getTodayIso(),
      effectiveTo: price.effectiveTo ? price.effectiveTo.split('T')[0] : '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.itemId || typeof formData.itemId !== 'number' || formData.itemId <= 0) {
      errors.itemId = 'Please select a catalog item.';
    }

    if (formData.unitPrice === '' || isNaN(Number(formData.unitPrice))) {
      errors.unitPrice = 'Unit price is required.';
    } else {
      const price = Number(formData.unitPrice);
      if (price <= 0) {
        errors.unitPrice = 'Unit price must be greater than zero.';
      }
    }

    if (!formData.currencyCode || !formData.currencyCode.trim()) {
      errors.currencyCode = 'Currency code is required.';
    } else if (!/^[A-Za-z]{3}$/.test(formData.currencyCode.trim())) {
      errors.currencyCode = 'Currency code must be exactly 3 letters (e.g. PKR, USD, EUR).';
    }

    if (formData.minimumOrderQuantity === '' || isNaN(Number(formData.minimumOrderQuantity))) {
      errors.minimumOrderQuantity = 'Minimum order quantity is required.';
    } else {
      const moq = Number(formData.minimumOrderQuantity);
      if (moq <= 0) {
        errors.minimumOrderQuantity = 'Minimum order quantity must be greater than zero.';
      }
    }

    if (!formData.effectiveFrom) {
      errors.effectiveFrom = 'Effective-from date is required.';
    }

    if (formData.effectiveTo && formData.effectiveFrom) {
      const from = new Date(formData.effectiveFrom);
      const to = new Date(formData.effectiveTo);
      if (to < from) {
        errors.effectiveTo = 'Effective-to date cannot be earlier than effective-from date.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId || !validateForm()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload: CreateVendorItemPriceRequest = {
      itemId: Number(formData.itemId),
      unitPrice: Number(formData.unitPrice),
      currencyCode: formData.currencyCode.trim().toUpperCase(),
      minimumOrderQuantity: Number(formData.minimumOrderQuantity),
      effectiveFrom: new Date(formData.effectiveFrom).toISOString(),
      effectiveTo: formData.effectiveTo ? new Date(formData.effectiveTo).toISOString() : null,
    };

    try {
      if (editingPrice) {
        await vendorService.updateItemPrice(
          selectedVendorId,
          editingPrice.id,
          payload as UpdateVendorItemPriceRequest
        );
        setSuccessMessage('Contract item price record updated successfully.');
      } else {
        await vendorService.createItemPrice(selectedVendorId, payload);
        setSuccessMessage('Contract item price record created successfully.');
      }
      setIsFormOpen(false);
      await loadPrices(selectedVendorId);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to save item price record.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Actions
  const handleDeactivate = async () => {
    if (!selectedVendorId || !deactivateConfirmPrice) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await vendorService.deactivateItemPrice(selectedVendorId, deactivateConfirmPrice.id);
      setSuccessMessage('Contract item price record deactivated.');
      setDeactivateConfirmPrice(null);
      await loadPrices(selectedVendorId);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to deactivate price record.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivate = async () => {
    if (!selectedVendorId || !activateConfirmPrice) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await vendorService.activateItemPrice(selectedVendorId, activateConfirmPrice.id);
      setSuccessMessage('Contract item price record reactivated.');
      setActivateConfirmPrice(null);
      await loadPrices(selectedVendorId);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to activate price record.'));
    } finally {
      setIsSubmitting(false);
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
            You do not have permission to view Vendor Item Pricing contracts.
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
            <DollarSign size={24} />
          </div>
          <div>
            <h1>Vendor Contract Pricing</h1>
            <p className="page-header-subtitle">
              Manage agreed supplier price lists, minimum order quantities, and effective term dates.
            </p>
          </div>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => selectedVendorId && loadPrices(selectedVendorId)}
            disabled={isLoadingPrices || !selectedVendorId}
            title="Refresh price list"
          >
            <RefreshCw size={16} className={isLoadingPrices ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          {canCreate && selectedVendorId && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenCreate}
              disabled={!isVendorEligible}
              title={
                !isVendorEligible
                  ? 'Only Approved and Active vendors can have item pricing contracts.'
                  : 'Add new item price contract'
              }
            >
              <Plus size={16} />
              <span>Add Price Record</span>
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

      {/* Selected Vendor Warning if Ineligible */}
      {selectedVendor && !isVendorEligible && (
        <div
          className="alert alert-warning"
          style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}
        >
          <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
          <div>
            <div style={{ fontWeight: 600 }}>Supplier Not Eligible for Pricing Contracts</div>
            <div style={{ fontSize: '0.875rem', marginTop: '0.2rem' }}>
              {!selectedVendor.isActive
                ? `Supplier "${selectedVendor.name}" is currently marked Inactive. Reactivate this vendor in the Vendors Directory before configuring pricing.`
                : `Supplier "${selectedVendor.name}" is in status "${selectedVendor.approvalStatus === VendorApprovalStatus.Blocked ? 'Blocked' : 'Pending Approval'}". Per procurement policy, item prices can only be registered for Approved vendors.`}
            </div>
          </div>
        </div>
      )}

      {/* Vendor Selector & Quick Overview Banner */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 320px' }}>
            <label htmlFor="vendor-pricing-selector" style={{ fontWeight: 600, color: 'var(--navy-900)', whiteSpace: 'nowrap' }}>
              Select Vendor:
            </label>
            <select
              id="vendor-pricing-selector"
              className="form-select"
              value={selectedVendorId ? String(selectedVendorId) : ''}
              onChange={(e) => handleVendorChange(e.target.value)}
              disabled={isLoadingVendors}
              style={{ maxWidth: 360 }}
            >
              {vendors.length === 0 ? (
                <option value="">No vendors found</option>
              ) : (
                vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    [{v.code}] {v.name}{' '}
                    {v.approvalStatus !== VendorApprovalStatus.Approved
                      ? `(${VENDOR_APPROVAL_STATUS_LABELS[v.approvalStatus] || 'Not Approved'})`
                      : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          {selectedVendor && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span className="code-badge">{selectedVendor.code}</span>
              <span style={{ fontWeight: 600, color: 'var(--navy-900)' }}>{selectedVendor.name}</span>
              <span className="badge badge-secondary">{selectedVendor.paymentTermsDays} Days Terms</span>
              {selectedVendor.approvalStatus === VendorApprovalStatus.Approved ? (
                <span className="badge badge-success">Approved</span>
              ) : selectedVendor.approvalStatus === VendorApprovalStatus.Blocked ? (
                <span className="badge badge-danger">Blocked</span>
              ) : (
                <span className="badge badge-warning">Pending Approval</span>
              )}
              <Link
                to="/vendors/directory"
                className="btn btn-ghost btn-sm"
                title="Back to Vendors Directory"
              >
                <ArrowLeft size={14} />
                <span>Vendor Directory</span>
              </Link>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => navigate(`/vendors/contacts?vendorId=${selectedVendor.id}`)}
                title="View Contacts for this vendor"
              >
                <Users size={14} />
                <span>Contacts</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      {selectedVendorId && (
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
            <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 380 }}>
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
                placeholder="Search item code, name, currency..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <label htmlFor="price-status-filter" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Status:
              </label>
              <select
                id="price-status-filter"
                className="form-select"
                style={{ width: 'auto', minWidth: '130px' }}
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
              >
                <option value="active">Active Price Contracts</option>
                <option value="all">All Records</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Table */}
      <div className="card table-container">
        {!selectedVendorId ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <Truck size={44} className="text-muted" style={{ margin: '0 auto 1rem', opacity: 0.6 }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--navy-900)' }}>
              No Vendor Selected
            </h3>
            <p className="text-muted" style={{ maxWidth: 420, margin: '0.5rem auto 1.25rem' }}>
              Please select a vendor from the dropdown above to view or manage agreed item prices.
            </p>
          </div>
        ) : isLoadingPrices ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <RefreshCw size={32} className="spin text-muted" style={{ margin: '0 auto 1rem' }} />
            <p className="text-muted">Loading vendor contract pricing...</p>
          </div>
        ) : filteredPrices.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <DollarSign size={44} className="text-muted" style={{ margin: '0 auto 1rem', opacity: 0.6 }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--navy-900)' }}>
              No Item Pricing Found
            </h3>
            <p className="text-muted" style={{ maxWidth: 420, margin: '0.5rem auto 1.25rem' }}>
              {searchQuery || activeFilter !== 'active'
                ? 'No price records match your search criteria.'
                : `No contract prices have been registered with ${selectedVendor?.name || 'this vendor'} yet.`}
            </p>
            {canCreate && isVendorEligible && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenCreate}
              >
                <Plus size={16} />
                <span>Add First Price Record</span>
              </button>
            )}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>SKU Code</th>
                <th>Catalog Item</th>
                <th style={{ textAlign: 'right' }}>Agreed Unit Price</th>
                <th style={{ textAlign: 'center' }}>Min Order Qty (MOQ)</th>
                <th>Effective Window</th>
                <th style={{ textAlign: 'center' }}>Schedule Status</th>
                <th style={{ textAlign: 'center' }}>Active</th>
                <th style={{ textAlign: 'right', width: '130px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPrices.map((price) => (
                <tr key={price.id} className={!price.isActive ? 'row-inactive' : undefined}>
                  <td>
                    <span className="code-badge">{price.itemCode}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>{price.itemName}</div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 700, color: 'var(--navy-900)', fontSize: '0.9375rem' }}>
                      {price.currencyCode} {Number(price.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-secondary">
                      {Number(price.minimumOrderQuantity).toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem' }}>
                      <Calendar size={13} className="text-muted" />
                      <span>
                        {formatDate(price.effectiveFrom)} &rarr; {price.effectiveTo ? formatDate(price.effectiveTo) : 'Indefinite'}
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {getEffectivenessBadge(price)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {price.isActive ? (
                      <span className="badge badge-success">Active</span>
                    ) : (
                      <span className="badge badge-secondary">Inactive</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      {canUpdate && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          title={
                            !isVendorEligible
                              ? 'Vendor is not eligible to update pricing'
                              : 'Edit Item Price Record'
                          }
                          disabled={!isVendorEligible}
                          onClick={() => handleOpenEdit(price)}
                        >
                          <Edit2 size={15} />
                        </button>
                      )}

                      {canDeactivate && (
                        price.isActive ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--accent-rose)' }}
                            title="Deactivate Price Record"
                            onClick={() => setDeactivateConfirmPrice(price)}
                          >
                            <Trash2 size={15} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--accent-emerald)' }}
                            title="Activate Price Record"
                            onClick={() => setActivateConfirmPrice(price)}
                          >
                            <CheckCircle size={15} />
                          </button>
                        )
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
          Create / Edit Vendor Item Price Modal
          ========================================================================= */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        size="md"
        title={editingPrice ? `Edit Contract Price: ${editingPrice.itemCode}` : `Add Contract Item Price`}
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
              {isSubmitting ? (
                <>
                  <RefreshCw size={14} className="spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{editingPrice ? 'Update Price' : 'Save Price'}</span>
              )}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Vendor Display */}
            <div style={{ background: 'var(--bg-surface-subtle)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Supplier Entity
              </span>
              <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>
                {selectedVendor ? `[${selectedVendor.code}] ${selectedVendor.name}` : '—'}
              </div>
            </div>

            {/* Catalog Item Selection */}
            <div>
              <label htmlFor="price-item-select" className="form-label required">Catalog Item</label>
              {editingPrice ? (
                <div>
                  <div
                    style={{
                      background: 'var(--bg-surface-subtle)',
                      padding: '0.625rem 0.875rem',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 600,
                      color: 'var(--navy-900)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <Package size={16} className="text-muted" />
                    <span>[{editingPrice.itemCode}] {editingPrice.itemName}</span>
                  </div>
                  <div className="form-hint" style={{ marginTop: '0.25rem' }}>
                    Note: Backend rule prevents changing the linked catalog item of an existing price record.
                  </div>
                </div>
              ) : (
                <>
                  <select
                    id="price-item-select"
                    className={`form-select ${formErrors.itemId ? 'border-danger' : ''}`}
                    value={formData.itemId ? String(formData.itemId) : ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        itemId: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                    required
                  >
                    <option value="">Select an Item from Catalog</option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id} disabled={!i.isActive}>
                        [{i.itemCode}] {i.name} {!i.isActive ? '(Inactive)' : ''}
                      </option>
                    ))}
                  </select>
                  {formErrors.itemId && <div className="form-error">{formErrors.itemId}</div>}
                </>
              )}
            </div>

            {/* Unit Price & Currency Code */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
              <div>
                <label htmlFor="price-unit-price-input" className="form-label required">Unit Price</label>
                <input
                  id="price-unit-price-input"
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  className={`form-input ${formErrors.unitPrice ? 'border-danger' : ''}`}
                  placeholder="0.00"
                  value={formData.unitPrice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      unitPrice: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                  required
                />
                {formErrors.unitPrice && <div className="form-error">{formErrors.unitPrice}</div>}
              </div>

              <div>
                <label htmlFor="price-currency-input" className="form-label required">Currency</label>
                <input
                  id="price-currency-input"
                  type="text"
                  maxLength={3}
                  className={`form-input ${formErrors.currencyCode ? 'border-danger' : ''}`}
                  placeholder="PKR"
                  value={formData.currencyCode}
                  onChange={(e) =>
                    setFormData({ ...formData, currencyCode: e.target.value.toUpperCase() })
                  }
                  required
                />
                {formErrors.currencyCode && <div className="form-error">{formErrors.currencyCode}</div>}
              </div>
            </div>

            {/* Minimum Order Quantity (MOQ) */}
            <div>
              <label htmlFor="price-moq-input" className="form-label required">Minimum Order Quantity (MOQ)</label>
              <input
                id="price-moq-input"
                type="number"
                step="0.0001"
                min="0.0001"
                className={`form-input ${formErrors.minimumOrderQuantity ? 'border-danger' : ''}`}
                placeholder="1"
                value={formData.minimumOrderQuantity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    minimumOrderQuantity: e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
                required
              />
              {formErrors.minimumOrderQuantity && (
                <div className="form-error">{formErrors.minimumOrderQuantity}</div>
              )}
              <div className="form-hint">Minimum purchase threshold required to claim this contract rate.</div>
            </div>

            {/* Effective Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label htmlFor="price-effective-from-input" className="form-label required">Effective From</label>
                <input
                  id="price-effective-from-input"
                  type="date"
                  className={`form-input ${formErrors.effectiveFrom ? 'border-danger' : ''}`}
                  value={formData.effectiveFrom}
                  onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                  required
                />
                {formErrors.effectiveFrom && <div className="form-error">{formErrors.effectiveFrom}</div>}
              </div>

              <div>
                <label htmlFor="price-effective-to-input" className="form-label">Effective To (Optional)</label>
                <input
                  id="price-effective-to-input"
                  type="date"
                  className={`form-input ${formErrors.effectiveTo ? 'border-danger' : ''}`}
                  value={formData.effectiveTo}
                  onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
                />
                {formErrors.effectiveTo && <div className="form-error">{formErrors.effectiveTo}</div>}
                <div className="form-hint">Leave blank for indefinite validity.</div>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          Confirmation Dialogs
          ========================================================================= */}
      {/* Deactivate Price Dialog */}
      <ConfirmDialog
        isOpen={!!deactivateConfirmPrice}
        onClose={() => setDeactivateConfirmPrice(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Contract Price"
        message={`Are you sure you want to deactivate the agreed pricing for "${deactivateConfirmPrice?.itemCode} - ${deactivateConfirmPrice?.itemName}"?`}
        confirmLabel="Deactivate"
        variant="danger"
        isLoading={isSubmitting}
      />

      {/* Activate Price Dialog */}
      <ConfirmDialog
        isOpen={!!activateConfirmPrice}
        onClose={() => setActivateConfirmPrice(null)}
        onConfirm={handleActivate}
        title="Reactivate Contract Price"
        message={`Are you sure you want to reactivate the contract pricing for "${activateConfirmPrice?.itemCode} - ${activateConfirmPrice?.itemName}"?`}
        confirmLabel="Activate"
        variant="success"
        isLoading={isSubmitting}
      />
    </div>
  );
};
