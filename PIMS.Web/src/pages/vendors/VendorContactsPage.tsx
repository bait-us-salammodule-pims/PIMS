import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Users,
  Plus,
  RefreshCw,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Star,
  Lock,
  Mail,
  Phone,
  Briefcase,
  ArrowLeft,
  Truck,
  DollarSign,
} from 'lucide-react';
import { vendorService } from '../../api/vendorService';
import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import type {
  Vendor,
  VendorContact,
  VendorContactFormData,
  CreateVendorContactRequest,
  UpdateVendorContactRequest,
} from '../../types/vendor';

export const VendorContactsPage: React.FC = () => {
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
  const [contacts, setContacts] = useState<VendorContact[]>([]);
  const [isLoadingVendors, setIsLoadingVendors] = useState(true);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('active');

  // Modals & Actions
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<VendorContact | null>(null);
  const [deactivateConfirmContact, setDeactivateConfirmContact] = useState<VendorContact | null>(null);
  const [activateConfirmContact, setActivateConfirmContact] = useState<VendorContact | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields & Validation
  const [formData, setFormData] = useState<VendorContactFormData>({
    name: '',
    designation: '',
    email: '',
    phone: '',
    isPrimary: false,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Current Vendor Object
  const selectedVendor = useMemo(() => {
    return vendors.find((v) => v.id === selectedVendorId) || null;
  }, [vendors, selectedVendorId]);

  // Load Vendors List
  const loadVendors = useCallback(async () => {
    if (!canView) return;
    setIsLoadingVendors(true);
    try {
      const data = await vendorService.getVendors();
      setVendors(data);

      // Auto-select first vendor if none selected and vendors exist
      if (!selectedVendorId && data.length > 0) {
        setSearchParams({ vendorId: String(data[0].id) });
      }
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to load vendors list.'));
    } finally {
      setIsLoadingVendors(false);
    }
  }, [canView, selectedVendorId, setSearchParams]);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  // Load Contacts for Selected Vendor
  const loadContacts = useCallback(async (vendorId: number) => {
    if (!canView || !vendorId) return;
    setIsLoadingContacts(true);
    setErrorMessage(null);
    try {
      const data = await vendorService.getContacts(vendorId);
      setContacts(data);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to load vendor contacts.'));
    } finally {
      setIsLoadingContacts(false);
    }
  }, [canView]);

  useEffect(() => {
    if (selectedVendorId) {
      loadContacts(selectedVendorId);
    } else {
      setContacts([]);
    }
  }, [selectedVendorId, loadContacts]);

  // Handle Vendor Selection Change
  const handleVendorChange = (newVendorId: string) => {
    if (newVendorId) {
      setSearchParams({ vendorId: newVendorId });
    } else {
      setSearchParams({});
    }
    setSearchQuery('');
  };

  // Filtered Contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      // Active filter
      if (activeFilter === 'active' && !c.isActive) return false;
      if (activeFilter === 'inactive' && c.isActive) return false;

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(query);
        const matchesDesig = c.designation?.toLowerCase().includes(query) ?? false;
        const matchesEmail = c.email?.toLowerCase().includes(query) ?? false;
        const matchesPhone = c.phone?.toLowerCase().includes(query) ?? false;
        return matchesName || matchesDesig || matchesEmail || matchesPhone;
      }

      return true;
    });
  }, [contacts, activeFilter, searchQuery]);

  // Form Handlers
  const handleOpenCreate = () => {
    setEditingContact(null);
    // If no existing contacts, suggest primary by default
    const hasExistingPrimary = contacts.some((c) => c.isPrimary && c.isActive);
    setFormData({
      name: '',
      designation: '',
      email: '',
      phone: '',
      isPrimary: !hasExistingPrimary,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (contact: VendorContact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      designation: contact.designation || '',
      email: contact.email || '',
      phone: contact.phone || '',
      isPrimary: contact.isPrimary,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Contact name is required.';
    } else if (formData.name.trim().length < 2 || formData.name.trim().length > 200) {
      errors.name = 'Name must be between 2 and 200 characters.';
    }

    if (formData.designation && formData.designation.length > 100) {
      errors.designation = 'Designation cannot exceed 100 characters.';
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
      errors.phone = 'Phone cannot exceed 30 characters.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId || !validateForm()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload: CreateVendorContactRequest = {
      name: formData.name.trim(),
      designation: formData.designation.trim() || null,
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      isPrimary: formData.isPrimary,
    };

    try {
      if (editingContact) {
        await vendorService.updateContact(
          selectedVendorId,
          editingContact.id,
          payload as UpdateVendorContactRequest
        );
        setSuccessMessage(`Contact "${payload.name}" updated successfully.`);
      } else {
        await vendorService.createContact(selectedVendorId, payload);
        setSuccessMessage(`Contact "${payload.name}" added successfully.`);
      }
      setIsFormOpen(false);
      await loadContacts(selectedVendorId);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to save contact.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Actions
  const handleDeactivate = async () => {
    if (!selectedVendorId || !deactivateConfirmContact) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await vendorService.deactivateContact(selectedVendorId, deactivateConfirmContact.id);
      setSuccessMessage(`Contact "${deactivateConfirmContact.name}" deactivated.`);
      setDeactivateConfirmContact(null);
      await loadContacts(selectedVendorId);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to deactivate contact.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivate = async () => {
    if (!selectedVendorId || !activateConfirmContact) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await vendorService.activateContact(selectedVendorId, activateConfirmContact.id);
      setSuccessMessage(`Contact "${activateConfirmContact.name}" reactivated.`);
      setActivateConfirmContact(null);
      await loadContacts(selectedVendorId);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to activate contact.'));
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
            You do not have permission to view Vendor Contacts.
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
            <Users size={24} />
          </div>
          <div>
            <h1>Vendor Contacts</h1>
            <p className="page-header-subtitle">
              Manage designated representatives, sales liaisons, and point-of-contact directories.
            </p>
          </div>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => selectedVendorId && loadContacts(selectedVendorId)}
            disabled={isLoadingContacts || !selectedVendorId}
            title="Refresh contacts"
          >
            <RefreshCw size={16} className={isLoadingContacts ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          {canCreate && selectedVendorId && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenCreate}
            >
              <Plus size={16} />
              <span>Add Contact</span>
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
            <label htmlFor="vendor-selector" style={{ fontWeight: 600, color: 'var(--navy-900)', whiteSpace: 'nowrap' }}>
              Select Vendor:
            </label>
            <select
              id="vendor-selector"
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
                    [{v.code}] {v.name} {!v.isActive ? '(Inactive)' : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          {selectedVendor && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span className="code-badge">{selectedVendor.code}</span>
              <span style={{ fontWeight: 600, color: 'var(--navy-900)' }}>{selectedVendor.name}</span>
              {selectedVendor.city && (
                <span className="badge badge-secondary">{selectedVendor.city}</span>
              )}
              {selectedVendor.isActive ? (
                <span className="badge badge-success">Active</span>
              ) : (
                <span className="badge badge-secondary">Inactive</span>
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
                onClick={() => navigate(`/vendors/pricing?vendorId=${selectedVendor.id}`)}
                title="View Item Pricing for this vendor"
              >
                <DollarSign size={14} />
                <span>Item Pricing</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar for Contacts */}
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
                placeholder="Search contact name, designation, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <label htmlFor="contact-status-filter" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Status:
              </label>
              <select
                id="contact-status-filter"
                className="form-select"
                style={{ width: 'auto', minWidth: '130px' }}
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
              >
                <option value="active">Active Contacts</option>
                <option value="all">All Contacts</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Contacts Table */}
      <div className="card table-container">
        {!selectedVendorId ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <Truck size={44} className="text-muted" style={{ margin: '0 auto 1rem', opacity: 0.6 }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--navy-900)' }}>
              No Vendor Selected
            </h3>
            <p className="text-muted" style={{ maxWidth: 420, margin: '0.5rem auto 1.25rem' }}>
              Please select a vendor from the dropdown above to view or manage their contact persons.
            </p>
          </div>
        ) : isLoadingContacts ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <RefreshCw size={32} className="spin text-muted" style={{ margin: '0 auto 1rem' }} />
            <p className="text-muted">Loading vendor contacts...</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <Users size={44} className="text-muted" style={{ margin: '0 auto 1rem', opacity: 0.6 }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--navy-900)' }}>
              No Contacts Registered
            </h3>
            <p className="text-muted" style={{ maxWidth: 420, margin: '0.5rem auto 1.25rem' }}>
              {searchQuery || activeFilter !== 'active'
                ? 'No contacts match your search and filter criteria.'
                : `No contacts have been added for ${selectedVendor?.name || 'this vendor'} yet.`}
            </p>
            {canCreate && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenCreate}
              >
                <Plus size={16} />
                <span>Add Contact Person</span>
              </button>
            )}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Contact Name</th>
                <th>Designation</th>
                <th>Email Address</th>
                <th>Phone Number</th>
                <th style={{ textAlign: 'center' }}>Primary Contact</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'right', width: '130px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((contact) => (
                <tr key={contact.id} className={!contact.isActive ? 'row-inactive' : undefined}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>{contact.name}</div>
                  </td>
                  <td>
                    {contact.designation ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem' }}>
                        <Briefcase size={13} className="text-muted" />
                        <span>{contact.designation}</span>
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    {contact.email ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem' }}>
                        <Mail size={13} className="text-muted" />
                        <a href={`mailto:${contact.email}`} style={{ color: 'var(--blue-600)' }}>
                          {contact.email}
                        </a>
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    {contact.phone ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem' }}>
                        <Phone size={13} className="text-muted" />
                        <a href={`tel:${contact.phone}`} style={{ color: 'var(--navy-700)' }}>
                          {contact.phone}
                        </a>
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {contact.isPrimary ? (
                      <span className="badge badge-warning" title="Primary business liaison">
                        <Star size={12} style={{ fill: '#b45309' }} /> Primary Contact
                      </span>
                    ) : (
                      <span className="text-muted" style={{ fontSize: '0.8125rem' }}>No</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {contact.isActive ? (
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
                          title="Edit Contact"
                          onClick={() => handleOpenEdit(contact)}
                        >
                          <Edit2 size={15} />
                        </button>
                      )}

                      {canDeactivate && (
                        contact.isActive ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--accent-rose)' }}
                            title="Deactivate Contact"
                            onClick={() => setDeactivateConfirmContact(contact)}
                          >
                            <Trash2 size={15} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--accent-emerald)' }}
                            title="Activate Contact"
                            onClick={() => setActivateConfirmContact(contact)}
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
          Create / Edit Contact Modal
          ========================================================================= */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        size="md"
        title={editingContact ? `Edit Contact: ${editingContact.name}` : `Add Contact Person`}
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
                <span>{editingContact ? 'Update Contact' : 'Save Contact'}</span>
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

            {/* Contact Name */}
            <div>
              <label htmlFor="contact-name-input" className="form-label required">Full Name</label>
              <input
                id="contact-name-input"
                type="text"
                className={`form-input ${formErrors.name ? 'border-danger' : ''}`}
                placeholder="e.g. Muhammad Zeeshan"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                maxLength={200}
                required
              />
              {formErrors.name && <div className="form-error">{formErrors.name}</div>}
            </div>

            {/* Designation */}
            <div>
              <label htmlFor="contact-designation-input" className="form-label">Job Title / Designation</label>
              <input
                id="contact-designation-input"
                type="text"
                className={`form-input ${formErrors.designation ? 'border-danger' : ''}`}
                placeholder="e.g. Key Account Manager / Sales Director"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                maxLength={100}
              />
              {formErrors.designation && <div className="form-error">{formErrors.designation}</div>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="contact-email-input" className="form-label">Email Address</label>
              <input
                id="contact-email-input"
                type="email"
                className={`form-input ${formErrors.email ? 'border-danger' : ''}`}
                placeholder="zeeshan@vendor.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                maxLength={254}
              />
              {formErrors.email && <div className="form-error">{formErrors.email}</div>}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="contact-phone-input" className="form-label">Phone / Mobile Number</label>
              <input
                id="contact-phone-input"
                type="tel"
                className={`form-input ${formErrors.phone ? 'border-danger' : ''}`}
                placeholder="+92 300 1234567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                maxLength={30}
              />
              {formErrors.phone && <div className="form-error">{formErrors.phone}</div>}
            </div>

            {/* Primary Contact Toggle */}
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.875rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.625rem',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  style={{ marginTop: '0.2rem' }}
                  checked={formData.isPrimary}
                  onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--navy-900)', fontSize: '0.875rem' }}>
                    Designate as Primary Contact
                  </div>
                  <div className="form-hint" style={{ marginTop: '0.15rem' }}>
                    Setting this contact as primary will automatically demote any previously designated
                    primary contact for this vendor.
                  </div>
                </div>
              </label>
            </div>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          Confirmation Dialogs
          ========================================================================= */}
      {/* Deactivate Contact Dialog */}
      <ConfirmDialog
        isOpen={!!deactivateConfirmContact}
        onClose={() => setDeactivateConfirmContact(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Contact"
        message={`Are you sure you want to deactivate "${deactivateConfirmContact?.name}"? Deactivated contacts will no longer appear in standard procurement notices.`}
        confirmLabel="Deactivate"
        variant="danger"
        isLoading={isSubmitting}
      />

      {/* Activate Contact Dialog */}
      <ConfirmDialog
        isOpen={!!activateConfirmContact}
        onClose={() => setActivateConfirmContact(null)}
        onConfirm={handleActivate}
        title="Reactivate Contact"
        message={`Are you sure you want to reactivate "${activateConfirmContact?.name}"?`}
        confirmLabel="Activate"
        variant="success"
        isLoading={isSubmitting}
      />
    </div>
  );
};
