import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
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
  Phone,
  Mail,
  ExternalLink,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Clock,
  DollarSign,
  Users,
} from 'lucide-react';
import { vendorService } from '../../api/vendorService';
import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  VendorApprovalStatus,
  type Vendor,
  type VendorFormData,
  type CreateVendorRequest,
  type UpdateVendorRequest,
} from '../../types/vendor';

export const VendorsDirectoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canView = hasPermission('VendorView');
  const canCreate = hasPermission('VendorCreate');
  const canUpdate = hasPermission('VendorUpdate');
  const canDeactivate = hasPermission('VendorDeactivate');

  // State
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [approvalFilter, setApprovalFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('active');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [viewingVendor, setViewingVendor] = useState<Vendor | null>(null);
  const [deactivateConfirmVendor, setDeactivateConfirmVendor] = useState<Vendor | null>(null);
  const [activateConfirmVendor, setActivateConfirmVendor] = useState<Vendor | null>(null);
  const [approveConfirmVendor, setApproveConfirmVendor] = useState<Vendor | null>(null);
  const [blockConfirmVendor, setBlockConfirmVendor] = useState<Vendor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields & Validation
  const [formData, setFormData] = useState<VendorFormData>({
    code: '',
    name: '',
    legalName: '',
    taxRegistrationNumber: '',
    registrationNumber: '',
    email: '',
    phone: '',
    website: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    province: '',
    country: '',
    postalCode: '',
    paymentTermsDays: 30,
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Load Data
  const loadData = useCallback(async () => {
    if (!canView) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await vendorService.getVendors();
      setVendors(data);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to load vendors directory.'));
    } finally {
      setIsLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered Vendors
  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      // Active filter
      if (activeFilter === 'active' && !v.isActive) return false;
      if (activeFilter === 'inactive' && v.isActive) return false;

      // Approval filter
      if (approvalFilter !== 'all') {
        const targetStatus = Number(approvalFilter);
        if (v.approvalStatus !== targetStatus) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesCode = v.code.toLowerCase().includes(query);
        const matchesName = v.name.toLowerCase().includes(query);
        const matchesLegal = v.legalName?.toLowerCase().includes(query) ?? false;
        const matchesCity = v.city?.toLowerCase().includes(query) ?? false;
        const matchesTax = v.taxRegistrationNumber?.toLowerCase().includes(query) ?? false;
        const matchesReg = v.registrationNumber?.toLowerCase().includes(query) ?? false;
        const matchesEmail = v.email?.toLowerCase().includes(query) ?? false;
        const matchesPhone = v.phone?.toLowerCase().includes(query) ?? false;
        return (
          matchesCode ||
          matchesName ||
          matchesLegal ||
          matchesCity ||
          matchesTax ||
          matchesReg ||
          matchesEmail ||
          matchesPhone
        );
      }

      return true;
    });
  }, [vendors, activeFilter, approvalFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = vendors.length;
    const active = vendors.filter((v) => v.isActive).length;
    const approved = vendors.filter((v) => v.approvalStatus === VendorApprovalStatus.Approved).length;
    const pending = vendors.filter((v) => v.approvalStatus === VendorApprovalStatus.PendingApproval).length;
    const blocked = vendors.filter((v) => v.approvalStatus === VendorApprovalStatus.Blocked).length;
    return { total, active, approved, pending, blocked };
  }, [vendors]);

  // Form Handlers
  const handleOpenCreate = () => {
    setEditingVendor(null);
    setFormData({
      code: '',
      name: '',
      legalName: '',
      taxRegistrationNumber: '',
      registrationNumber: '',
      email: '',
      phone: '',
      website: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      province: '',
      country: '',
      postalCode: '',
      paymentTermsDays: 30,
      notes: '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      code: vendor.code,
      name: vendor.name,
      legalName: vendor.legalName || '',
      taxRegistrationNumber: vendor.taxRegistrationNumber || '',
      registrationNumber: vendor.registrationNumber || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      website: vendor.website || '',
      addressLine1: vendor.addressLine1 || '',
      addressLine2: vendor.addressLine2 || '',
      city: vendor.city || '',
      province: vendor.province || '',
      country: vendor.country || '',
      postalCode: vendor.postalCode || '',
      paymentTermsDays: vendor.paymentTermsDays,
      notes: vendor.notes || '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.code.trim()) {
      errors.code = 'Vendor code is required.';
    } else if (formData.code.trim().length < 2 || formData.code.trim().length > 50) {
      errors.code = 'Vendor code must be between 2 and 50 characters.';
    }

    if (!formData.name.trim()) {
      errors.name = 'Vendor name is required.';
    } else if (formData.name.trim().length < 2 || formData.name.trim().length > 200) {
      errors.name = 'Vendor name must be between 2 and 200 characters.';
    }

    if (formData.legalName && formData.legalName.length > 200) {
      errors.legalName = 'Legal name cannot exceed 200 characters.';
    }

    if (formData.taxRegistrationNumber && formData.taxRegistrationNumber.length > 100) {
      errors.taxRegistrationNumber = 'Tax registration number cannot exceed 100 characters.';
    }

    if (formData.registrationNumber && formData.registrationNumber.length > 100) {
      errors.registrationNumber = 'Registration number cannot exceed 100 characters.';
    }

    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'Please enter a valid email address.';
      } else if (formData.email.length > 254) {
        errors.email = 'Email cannot exceed 254 characters.';
      }
    }

    if (formData.phone && formData.phone.length > 30) {
      errors.phone = 'Phone number cannot exceed 30 characters.';
    }

    if (formData.website && formData.website.trim()) {
      try {
        new URL(formData.website.trim());
      } catch {
        errors.website = 'Please enter a valid URL (including http:// or https://).';
      }
    }

    if (formData.paymentTermsDays === '' || isNaN(Number(formData.paymentTermsDays))) {
      errors.paymentTermsDays = 'Payment terms in days is required.';
    } else {
      const days = Number(formData.paymentTermsDays);
      if (days < 0 || days > 365) {
        errors.paymentTermsDays = 'Payment terms must be between 0 and 365 days.';
      }
    }

    if (formData.notes && formData.notes.length > 2000) {
      errors.notes = 'Notes cannot exceed 2000 characters.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload: CreateVendorRequest = {
      code: formData.code.trim().toUpperCase(),
      name: formData.name.trim(),
      legalName: formData.legalName.trim() || null,
      taxRegistrationNumber: formData.taxRegistrationNumber.trim() || null,
      registrationNumber: formData.registrationNumber.trim() || null,
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      website: formData.website.trim() || null,
      addressLine1: formData.addressLine1.trim() || null,
      addressLine2: formData.addressLine2.trim() || null,
      city: formData.city.trim() || null,
      province: formData.province.trim() || null,
      country: formData.country.trim() || null,
      postalCode: formData.postalCode.trim() || null,
      paymentTermsDays: Number(formData.paymentTermsDays),
      notes: formData.notes.trim() || null,
    };

    try {
      if (editingVendor) {
        await vendorService.updateVendor(editingVendor.id, payload as UpdateVendorRequest);
        setSuccessMessage(`Vendor "${payload.name}" updated successfully.`);
      } else {
        await vendorService.createVendor(payload);
        setSuccessMessage(`Vendor "${payload.name}" created successfully.`);
      }
      setIsFormOpen(false);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to save vendor.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Action Handlers
  const handleApprove = async () => {
    if (!approveConfirmVendor) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await vendorService.approveVendor(approveConfirmVendor.id);
      setSuccessMessage(`Vendor "${approveConfirmVendor.name}" approved successfully.`);
      setApproveConfirmVendor(null);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to approve vendor.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlock = async () => {
    if (!blockConfirmVendor) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await vendorService.blockVendor(blockConfirmVendor.id);
      setSuccessMessage(`Vendor "${blockConfirmVendor.name}" has been blocked.`);
      setBlockConfirmVendor(null);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to block vendor.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateConfirmVendor) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await vendorService.deleteVendor(deactivateConfirmVendor.id);
      setSuccessMessage(`Vendor "${deactivateConfirmVendor.name}" deactivated successfully.`);
      setDeactivateConfirmVendor(null);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to deactivate vendor.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivate = async () => {
    if (!activateConfirmVendor) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await vendorService.activateVendor(activateConfirmVendor.id);
      setSuccessMessage(`Vendor "${activateConfirmVendor.name}" activated successfully.`);
      setActivateConfirmVendor(null);
      await loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to activate vendor.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderApprovalBadge = (status: VendorApprovalStatus) => {
    switch (status) {
      case VendorApprovalStatus.Approved:
        return (
          <span className="badge badge-success" title="Approved vendor">
            <CheckCircle size={12} /> Approved
          </span>
        );
      case VendorApprovalStatus.Blocked:
        return (
          <span className="badge badge-danger" title="Blocked vendor">
            <XCircle size={12} /> Blocked
          </span>
        );
      case VendorApprovalStatus.PendingApproval:
      default:
        return (
          <span className="badge badge-warning" title="Pending approval">
            <Clock size={12} /> Pending Approval
          </span>
        );
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
            You do not have permission to view the Vendors Directory. Please contact your system
            administrator if you require access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-title">
          <div className="page-header-icon">
            <Truck size={24} />
          </div>
          <div>
            <h1>Vendors Directory</h1>
            <p className="page-header-subtitle">
              Manage approved suppliers, contact profiles, commercial terms, and compliance records.
            </p>
          </div>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadData}
            disabled={isLoading}
            title="Refresh vendor list"
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
              <span>Add Vendor</span>
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
            Total Vendors
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--navy-900)' }}>
            {stats.total}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Active Suppliers
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
            {stats.active}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Approved
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--blue-600)' }}>
            {stats.approved}
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
            Blocked
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--accent-rose)' }}>
            {stats.blocked}
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
            gap: '1rem',
            justifyContent: 'space-between',
          }}
        >
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '420px' }}>
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
              placeholder="Search by code, name, city, tax #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter Dropdowns */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <label htmlFor="vendor-approval-filter" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Approval:
              </label>
              <select
                id="vendor-approval-filter"
                className="form-select"
                style={{ width: 'auto', minWidth: '150px' }}
                value={approvalFilter}
                onChange={(e) => setApprovalFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value={String(VendorApprovalStatus.PendingApproval)}>Pending Approval</option>
                <option value={String(VendorApprovalStatus.Approved)}>Approved</option>
                <option value={String(VendorApprovalStatus.Blocked)}>Blocked</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <label htmlFor="vendor-status-filter" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Status:
              </label>
              <select
                id="vendor-status-filter"
                className="form-select"
                style={{ width: 'auto', minWidth: '130px' }}
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
              >
                <option value="active">Active Only</option>
                <option value="all">All Vendors</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="card table-container">
        {isLoading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <RefreshCw size={32} className="spin text-muted" style={{ margin: '0 auto 1rem' }} />
            <p className="text-muted">Loading vendors directory...</p>
          </div>
        ) : filteredVendors.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <Truck size={44} className="text-muted" style={{ margin: '0 auto 1rem', opacity: 0.6 }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--navy-900)' }}>
              No Vendors Found
            </h3>
            <p className="text-muted" style={{ maxWidth: 420, margin: '0.5rem auto 1.25rem' }}>
              {searchQuery || approvalFilter !== 'all' || activeFilter !== 'active'
                ? 'No vendors match your search and filter criteria. Try adjusting your filters.'
                : 'No vendors are registered in the directory yet. Click below to add your first supplier.'}
            </p>
            {canCreate && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenCreate}
              >
                <Plus size={16} />
                <span>Add Vendor</span>
              </button>
            )}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Code</th>
                <th>Supplier / Business</th>
                <th>Tax &amp; Reg</th>
                <th>Contact Details</th>
                <th>City &amp; Country</th>
                <th style={{ textAlign: 'center' }}>Payment Terms</th>
                <th style={{ textAlign: 'center' }}>Approval</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'right', width: '220px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.map((vendor) => (
                <tr key={vendor.id} className={!vendor.isActive ? 'row-inactive' : undefined}>
                  <td>
                    <span className="code-badge">{vendor.code}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>{vendor.name}</div>
                    {vendor.legalName && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {vendor.legalName}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8125rem' }}>
                      {vendor.taxRegistrationNumber ? (
                        <div>NTN/GST: <span style={{ fontWeight: 500 }}>{vendor.taxRegistrationNumber}</span></div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                      {vendor.registrationNumber && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Reg: {vendor.registrationNumber}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8125rem' }}>
                      {vendor.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Mail size={12} className="text-muted" />
                          <span>{vendor.email}</span>
                        </div>
                      )}
                      {vendor.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)' }}>
                          <Phone size={12} />
                          <span>{vendor.phone}</span>
                        </div>
                      )}
                      {!vendor.email && !vendor.phone && <span className="text-muted">—</span>}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {vendor.city || vendor.country ? (
                        <>
                          <MapPin size={12} className="text-muted" />
                          <span>
                            {[vendor.city, vendor.province, vendor.country].filter(Boolean).join(', ')}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-secondary" title={`${vendor.paymentTermsDays} days credit`}>
                      {vendor.paymentTermsDays} Days
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {renderApprovalBadge(vendor.approvalStatus)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {vendor.isActive ? (
                      <span className="badge badge-success">Active</span>
                    ) : (
                      <span className="badge badge-secondary">Inactive</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      {/* Navigate to Contacts */}
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        title="Manage Vendor Contacts"
                        onClick={() => navigate(`/vendors/contacts?vendorId=${vendor.id}`)}
                      >
                        <Users size={15} />
                      </button>

                      {/* Navigate to Pricing */}
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        title="Manage Item Pricing"
                        onClick={() => navigate(`/vendors/pricing?vendorId=${vendor.id}`)}
                      >
                        <DollarSign size={15} />
                      </button>

                      {/* View Details */}
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        title="View Vendor Details"
                        onClick={() => setViewingVendor(vendor)}
                      >
                        <Eye size={15} />
                      </button>

                      {/* Edit */}
                      {canUpdate && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          title="Edit Vendor"
                          onClick={() => handleOpenEdit(vendor)}
                        >
                          <Edit2 size={15} />
                        </button>
                      )}

                      {/* Approve button */}
                      {canUpdate && vendor.approvalStatus !== VendorApprovalStatus.Approved && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--accent-emerald)' }}
                          title="Approve Vendor"
                          onClick={() => setApproveConfirmVendor(vendor)}
                        >
                          <ShieldCheck size={15} />
                        </button>
                      )}

                      {/* Block button */}
                      {canUpdate && vendor.approvalStatus !== VendorApprovalStatus.Blocked && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--accent-rose)' }}
                          title="Block Vendor"
                          onClick={() => setBlockConfirmVendor(vendor)}
                        >
                          <ShieldAlert size={15} />
                        </button>
                      )}

                      {/* Activate / Deactivate */}
                      {canDeactivate && (
                        vendor.isActive ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--accent-rose)' }}
                            title="Deactivate Vendor"
                            onClick={() => setDeactivateConfirmVendor(vendor)}
                          >
                            <Trash2 size={15} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--accent-emerald)' }}
                            title="Activate Vendor"
                            onClick={() => setActivateConfirmVendor(vendor)}
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
          Create / Edit Vendor Modal
          ========================================================================= */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        size="lg"
        title={editingVendor ? `Edit Vendor: ${editingVendor.name}` : 'Register New Vendor'}
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
                <span>{editingVendor ? 'Update Vendor' : 'Create Vendor'}</span>
              )}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Vendor Code */}
            <div>
              <label htmlFor="vendor-code-input" className="form-label required">Vendor Code</label>
              <input
                id="vendor-code-input"
                type="text"
                className={`form-input ${formErrors.code ? 'border-danger' : ''}`}
                placeholder="e.g. VEN-001 or SUP-ABC"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                maxLength={50}
                required
              />
              {formErrors.code && <div className="form-error">{formErrors.code}</div>}
              <div className="form-hint">Unique business code (2–50 characters).</div>
            </div>

            {/* Vendor Name */}
            <div>
              <label htmlFor="vendor-name-input" className="form-label required">Supplier / Trade Name</label>
              <input
                id="vendor-name-input"
                type="text"
                className={`form-input ${formErrors.name ? 'border-danger' : ''}`}
                placeholder="e.g. Al-Madina Paper Traders"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                maxLength={200}
                required
              />
              {formErrors.name && <div className="form-error">{formErrors.name}</div>}
            </div>

            {/* Legal Name */}
            <div>
              <label htmlFor="vendor-legal-name-input" className="form-label">Legal / Registered Name</label>
              <input
                id="vendor-legal-name-input"
                type="text"
                className={`form-input ${formErrors.legalName ? 'border-danger' : ''}`}
                placeholder="e.g. Al-Madina Traders Pvt Ltd"
                value={formData.legalName}
                onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                maxLength={200}
              />
              {formErrors.legalName && <div className="form-error">{formErrors.legalName}</div>}
            </div>

            {/* Tax Registration Number */}
            <div>
              <label htmlFor="vendor-tax-reg-input" className="form-label">Tax Reg # (NTN / GST / VAT)</label>
              <input
                id="vendor-tax-reg-input"
                type="text"
                className={`form-input ${formErrors.taxRegistrationNumber ? 'border-danger' : ''}`}
                placeholder="e.g. 1234567-8"
                value={formData.taxRegistrationNumber}
                onChange={(e) => setFormData({ ...formData, taxRegistrationNumber: e.target.value })}
                maxLength={100}
              />
              {formErrors.taxRegistrationNumber && (
                <div className="form-error">{formErrors.taxRegistrationNumber}</div>
              )}
            </div>

            {/* Registration Number */}
            <div>
              <label htmlFor="vendor-reg-num-input" className="form-label">Company Registration #</label>
              <input
                id="vendor-reg-num-input"
                type="text"
                className={`form-input ${formErrors.registrationNumber ? 'border-danger' : ''}`}
                placeholder="e.g. SECP-889900"
                value={formData.registrationNumber}
                onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                maxLength={100}
              />
              {formErrors.registrationNumber && (
                <div className="form-error">{formErrors.registrationNumber}</div>
              )}
            </div>

            {/* Payment Terms Days */}
            <div>
              <label htmlFor="vendor-payment-terms-input" className="form-label required">Payment Terms (Days)</label>
              <input
                id="vendor-payment-terms-input"
                type="number"
                min={0}
                max={365}
                className={`form-input ${formErrors.paymentTermsDays ? 'border-danger' : ''}`}
                placeholder="30"
                value={formData.paymentTermsDays}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    paymentTermsDays: e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
                required
              />
              {formErrors.paymentTermsDays && (
                <div className="form-error">{formErrors.paymentTermsDays}</div>
              )}
              <div className="form-hint">Credit window allowed for invoice settlements (0–365 days).</div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="vendor-email-input" className="form-label">Primary Email</label>
              <input
                id="vendor-email-input"
                type="email"
                className={`form-input ${formErrors.email ? 'border-danger' : ''}`}
                placeholder="sales@vendor.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                maxLength={254}
              />
              {formErrors.email && <div className="form-error">{formErrors.email}</div>}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="vendor-phone-input" className="form-label">Phone Number</label>
              <input
                id="vendor-phone-input"
                type="tel"
                className={`form-input ${formErrors.phone ? 'border-danger' : ''}`}
                placeholder="+92 21 34567890"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                maxLength={30}
              />
              {formErrors.phone && <div className="form-error">{formErrors.phone}</div>}
            </div>

            {/* Website */}
            <div style={{ gridColumn: 'span 2' }}>
              <label htmlFor="vendor-website-input" className="form-label">Website URL</label>
              <input
                id="vendor-website-input"
                type="url"
                className={`form-input ${formErrors.website ? 'border-danger' : ''}`}
                placeholder="https://www.vendor.com"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                maxLength={300}
              />
              {formErrors.website && <div className="form-error">{formErrors.website}</div>}
            </div>

            {/* Address Line 1 */}
            <div style={{ gridColumn: 'span 2' }}>
              <label htmlFor="vendor-addr1-input" className="form-label">Address Line 1</label>
              <input
                id="vendor-addr1-input"
                type="text"
                className="form-input"
                placeholder="Suite, Building, Street Address"
                value={formData.addressLine1}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                maxLength={250}
              />
            </div>

            {/* Address Line 2 */}
            <div style={{ gridColumn: 'span 2' }}>
              <label htmlFor="vendor-addr2-input" className="form-label">Address Line 2 (Optional)</label>
              <input
                id="vendor-addr2-input"
                type="text"
                className="form-input"
                placeholder="Apartment, unit, floor, landmark"
                value={formData.addressLine2}
                onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                maxLength={250}
              />
            </div>

            {/* City */}
            <div>
              <label htmlFor="vendor-city-input" className="form-label">City</label>
              <input
                id="vendor-city-input"
                type="text"
                className="form-input"
                placeholder="e.g. Karachi"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                maxLength={100}
              />
            </div>

            {/* Province / State */}
            <div>
              <label htmlFor="vendor-province-input" className="form-label">Province / State</label>
              <input
                id="vendor-province-input"
                type="text"
                className="form-input"
                placeholder="e.g. Sindh"
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                maxLength={100}
              />
            </div>

            {/* Country */}
            <div>
              <label htmlFor="vendor-country-input" className="form-label">Country</label>
              <input
                id="vendor-country-input"
                type="text"
                className="form-input"
                placeholder="e.g. Pakistan"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                maxLength={100}
              />
            </div>

            {/* Postal Code */}
            <div>
              <label htmlFor="vendor-postal-input" className="form-label">Postal / ZIP Code</label>
              <input
                id="vendor-postal-input"
                type="text"
                className="form-input"
                placeholder="e.g. 74000"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                maxLength={20}
              />
            </div>

            {/* Notes */}
            <div style={{ gridColumn: 'span 2' }}>
              <label htmlFor="vendor-notes-input" className="form-label">Operational Notes &amp; Terms</label>
              <textarea
                id="vendor-notes-input"
                className="form-textarea"
                rows={3}
                placeholder="Additional notes, procurement agreements, or compliance details..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                maxLength={2000}
              />
              <div className="form-hint">Maximum 2,000 characters.</div>
            </div>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          View Vendor Details Modal
          ========================================================================= */}
      <Modal
        isOpen={!!viewingVendor}
        onClose={() => setViewingVendor(null)}
        size="lg"
        title={
          viewingVendor ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="code-badge">{viewingVendor.code}</span>
              <span>{viewingVendor.name}</span>
            </div>
          ) : (
            'Vendor Details'
          )
        }
        footer={
          viewingVendor && (
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    navigate(`/vendors/contacts?vendorId=${viewingVendor.id}`);
                    setViewingVendor(null);
                  }}
                >
                  <Users size={14} />
                  <span>View Contacts</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    navigate(`/vendors/pricing?vendorId=${viewingVendor.id}`);
                    setViewingVendor(null);
                  }}
                >
                  <DollarSign size={14} />
                  <span>Item Pricing</span>
                </button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {canUpdate && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      const v = viewingVendor;
                      setViewingVendor(null);
                      handleOpenEdit(v);
                    }}
                  >
                    <Edit2 size={14} />
                    <span>Edit Vendor</span>
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setViewingVendor(null)}
                >
                  Close
                </button>
              </div>
            </div>
          )
        }
      >
        {viewingVendor && (
          <div className="detail-grid">
            <div className="detail-item">
              <div className="detail-label">Vendor Code</div>
              <div className="detail-value">
                <span className="code-badge">{viewingVendor.code}</span>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Supplier Name</div>
              <div className="detail-value">{viewingVendor.name}</div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Legal Registered Name</div>
              <div className="detail-value">{viewingVendor.legalName || '—'}</div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Payment Terms</div>
              <div className="detail-value">
                <span className="badge badge-secondary">{viewingVendor.paymentTermsDays} Days</span>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Tax Reg # (NTN / GST)</div>
              <div className="detail-value">{viewingVendor.taxRegistrationNumber || '—'}</div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Company Registration #</div>
              <div className="detail-value">{viewingVendor.registrationNumber || '—'}</div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Approval Status</div>
              <div className="detail-value">{renderApprovalBadge(viewingVendor.approvalStatus)}</div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Active Status</div>
              <div className="detail-value">
                {viewingVendor.isActive ? (
                  <span className="badge badge-success">Active</span>
                ) : (
                  <span className="badge badge-secondary">Inactive</span>
                )}
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Email Address</div>
              <div className="detail-value">
                {viewingVendor.email ? (
                  <a href={`mailto:${viewingVendor.email}`} style={{ color: 'var(--blue-600)' }}>
                    {viewingVendor.email}
                  </a>
                ) : (
                  '—'
                )}
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Phone</div>
              <div className="detail-value">
                {viewingVendor.phone ? (
                  <a href={`tel:${viewingVendor.phone}`} style={{ color: 'var(--blue-600)' }}>
                    {viewingVendor.phone}
                  </a>
                ) : (
                  '—'
                )}
              </div>
            </div>

            <div className="detail-item full-width">
              <div className="detail-label">Website</div>
              <div className="detail-value">
                {viewingVendor.website ? (
                  <a
                    href={viewingVendor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--blue-600)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <span>{viewingVendor.website}</span>
                    <ExternalLink size={13} />
                  </a>
                ) : (
                  '—'
                )}
              </div>
            </div>

            <div className="detail-item full-width">
              <div className="detail-label">Physical Address</div>
              <div className="detail-value">
                {[
                  viewingVendor.addressLine1,
                  viewingVendor.addressLine2,
                  viewingVendor.city,
                  viewingVendor.province,
                  viewingVendor.postalCode,
                  viewingVendor.country,
                ]
                  .filter(Boolean)
                  .join(', ') || '—'}
              </div>
            </div>

            {viewingVendor.notes && (
              <div className="detail-item full-width">
                <div className="detail-label">Notes &amp; Remarks</div>
                <div className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>
                  {viewingVendor.notes}
                </div>
              </div>
            )}

            <div className="detail-item">
              <div className="detail-label">Registered On</div>
              <div className="detail-value">
                {new Date(viewingVendor.createdAt).toLocaleString()}
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Last Updated</div>
              <div className="detail-value">
                {viewingVendor.updatedAt
                  ? new Date(viewingVendor.updatedAt).toLocaleString()
                  : 'Never'}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* =========================================================================
          Confirmation Dialogs
          ========================================================================= */}
      {/* Approve Confirmation */}
      <ConfirmDialog
        isOpen={!!approveConfirmVendor}
        onClose={() => setApproveConfirmVendor(null)}
        onConfirm={handleApprove}
        title="Approve Vendor"
        message={`Are you sure you want to approve "${approveConfirmVendor?.name}"? Approved vendors are qualified to submit bids, receive Purchase Orders, and register contract item pricing.`}
        confirmLabel="Approve Vendor"
        variant="success"
        isLoading={isSubmitting}
      />

      {/* Block Confirmation */}
      <ConfirmDialog
        isOpen={!!blockConfirmVendor}
        onClose={() => setBlockConfirmVendor(null)}
        onConfirm={handleBlock}
        title="Block Vendor"
        message={`Are you sure you want to block "${blockConfirmVendor?.name}"? Blocked vendors will not be eligible to participate in RFQs, issue quotations, or receive new purchase orders.`}
        confirmLabel="Block Vendor"
        variant="danger"
        isLoading={isSubmitting}
      />

      {/* Deactivate Confirmation */}
      <ConfirmDialog
        isOpen={!!deactivateConfirmVendor}
        onClose={() => setDeactivateConfirmVendor(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Vendor"
        message={`Are you sure you want to deactivate "${deactivateConfirmVendor?.name}"? Inactive vendors will be hidden from default operational workflows.`}
        confirmLabel="Deactivate"
        variant="danger"
        isLoading={isSubmitting}
      />

      {/* Activate Confirmation */}
      <ConfirmDialog
        isOpen={!!activateConfirmVendor}
        onClose={() => setActivateConfirmVendor(null)}
        onConfirm={handleActivate}
        title="Activate Vendor"
        message={`Are you sure you want to reactivate "${activateConfirmVendor?.name}"?`}
        confirmLabel="Activate"
        variant="success"
        isLoading={isSubmitting}
      />
    </div>
  );
};
