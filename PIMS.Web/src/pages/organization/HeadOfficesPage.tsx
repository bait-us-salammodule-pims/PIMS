import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Building2,
  Plus,
  RefreshCw,
  Search,
  Edit2,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Lock,
} from 'lucide-react';
import { organizationService } from '../../api/organizationService';
import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import type { HeadOffice, HeadOfficeFormData } from '../../types/organization';

export const HeadOfficesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canView = hasPermission('OrganizationView');
  const canManage = hasPermission('OrganizationManage');

  // State
  const [headOffices, setHeadOffices] = useState<HeadOffice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HeadOffice | null>(null);
  const [viewingItem, setViewingItem] = useState<HeadOffice | null>(null);
  const [confirmItem, setConfirmItem] = useState<{
    item: HeadOffice;
    action: 'activate' | 'deactivate';
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields & Errors
  const [formData, setFormData] = useState<HeadOfficeFormData>({
    code: '',
    name: '',
    address: '',
    phone: '',
    email: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch records
  const loadData = useCallback(async () => {
    if (!canView) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await organizationService.getHeadOffices(includeInactive);
      setHeadOffices(data);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to load head offices.'));
    } finally {
      setIsLoading(false);
    }
  }, [canView, includeInactive]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Client-side search filtering
  const filteredHeadOffices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return headOffices;
    return headOffices.filter(
      (ho) =>
        ho.name.toLowerCase().includes(q) ||
        ho.code.toLowerCase().includes(q) ||
        ho.email?.toLowerCase().includes(q) ||
        ho.phone?.toLowerCase().includes(q) ||
        ho.address?.toLowerCase().includes(q)
    );
  }, [headOffices, searchQuery]);

  // Form Modal Handlers
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      code: '',
      name: '',
      address: '',
      phone: '',
      email: '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: HeadOffice) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      address: item.address || '',
      phone: item.phone || '',
      email: item.email || '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.code.trim()) {
      errors.code = 'Head office code is required.';
    } else if (formData.code.trim().length > 50) {
      errors.code = 'Code cannot exceed 50 characters.';
    }

    if (!formData.name.trim()) {
      errors.name = 'Head office name is required.';
    } else if (formData.name.trim().length > 200) {
      errors.name = 'Name cannot exceed 200 characters.';
    }

    if (formData.email?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'Invalid email address format.';
      } else if (formData.email.trim().length > 150) {
        errors.email = 'Email cannot exceed 150 characters.';
      }
    }

    if (formData.phone?.trim() && formData.phone.trim().length > 50) {
      errors.phone = 'Phone cannot exceed 50 characters.';
    }

    if (formData.address?.trim() && formData.address.trim().length > 500) {
      errors.address = 'Address cannot exceed 500 characters.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (editingItem) {
        await organizationService.updateHeadOffice(editingItem.id, formData);
        setSuccessMessage(`Head office "${formData.name.trim()}" updated successfully.`);
      } else {
        await organizationService.createHeadOffice(formData);
        setSuccessMessage(`Head office "${formData.name.trim()}" created successfully.`);
      }
      setIsFormOpen(false);
      loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to save head office.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Change Handlers
  const handleConfirmStatusChange = async () => {
    if (!confirmItem) return;
    const { item, action } = confirmItem;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (action === 'deactivate') {
        await organizationService.deactivateHeadOffice(item.id);
        setSuccessMessage(`Head office "${item.name}" deactivated successfully.`);
      } else {
        await organizationService.activateHeadOffice(item.id);
        setSuccessMessage(`Head office "${item.name}" activated successfully.`);
      }
      setConfirmItem(null);
      loadData();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, `Failed to ${action} head office.`));
      setConfirmItem(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canView) {
    return (
      <div className="unauthorized-container">
        <div className="unauthorized-card">
          <div className="unauthorized-icon-wrap">
            <Lock size={40} className="text-danger" />
          </div>
          <h2>Access Restricted</h2>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
            You do not have the <code>OrganizationView</code> permission required to view head offices.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header-row">
        <div className="page-title-group">
          <h1 className="page-main-title">
            <Building2 size={26} className="text-primary" />
            <span>Head Offices</span>
          </h1>
          <p className="page-subtitle">
            Manage enterprise corporate entities and headquarters registrations.
          </p>
        </div>

        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadData}
            disabled={isLoading}
            title="Refresh list"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {canManage && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleOpenCreate}
            >
              <Plus size={16} />
              <span>New Head Office</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
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

      {/* Filters & Search */}
      <div className="filter-card">
        <div className="filter-controls-group">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by name, code, phone, email..."
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
            <span>Show Inactive Records</span>
          </label>
        </div>

        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Showing <strong>{filteredHeadOffices.length}</strong> of{' '}
          <strong>{headOffices.length}</strong> records
        </div>
      </div>

      {/* Data Table */}
      <div className="data-table-container">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '120px' }}>Code</th>
                <th>Name</th>
                <th>Contact Details</th>
                <th>Address</th>
                <th style={{ width: '100px' }}>Status</th>
                <th style={{ width: '120px' }}>Created</th>
                <th style={{ width: '140px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Loading head offices from server...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredHeadOffices.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="table-empty-state">
                      <div className="empty-state-icon">
                        <Building2 size={28} />
                      </div>
                      <div className="empty-state-title">No Head Offices Found</div>
                      <div className="empty-state-desc">
                        {searchQuery
                          ? 'No records match your active search filter.'
                          : 'No head offices are registered in the system.'}
                      </div>
                      {canManage && !searchQuery && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={handleOpenCreate}
                        >
                          <Plus size={15} />
                          <span>Create First Head Office</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredHeadOffices.map((item) => (
                  <tr key={item.id} className={!item.isActive ? 'row-inactive' : ''}>
                    <td>
                      <span className="code-badge">{item.code}</span>
                    </td>
                    <td>
                      <span className="record-name-text">{item.name}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.8125rem' }}>
                        {item.email && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--navy-700)' }}>
                            <Mail size={12} className="text-muted" />
                            <span>{item.email}</span>
                          </span>
                        )}
                        {item.phone && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--navy-700)' }}>
                            <Phone size={12} className="text-muted" />
                            <span>{item.phone}</span>
                          </span>
                        )}
                        {!item.email && !item.phone && (
                          <span style={{ color: 'var(--text-light)' }}>—</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {item.address ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            maxWidth: '220px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={item.address}
                        >
                          <MapPin size={12} className="text-muted" style={{ flexShrink: 0 }} />
                          <span>{item.address}</span>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-light)' }}>—</span>
                      )}
                    </td>
                    <td>
                      {item.isActive ? (
                        <span className="badge badge-success">Active</span>
                      ) : (
                        <span className="badge badge-danger">Inactive</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="action-cell" style={{ justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn-icon btn-icon-primary"
                          title="View Details"
                          onClick={() => setViewingItem(item)}
                        >
                          <Eye size={16} />
                        </button>

                        {canManage && (
                          <>
                            <button
                              type="button"
                              className="btn-icon"
                              title="Edit Record"
                              onClick={() => handleOpenEdit(item)}
                            >
                              <Edit2 size={16} />
                            </button>

                            {item.isActive ? (
                              <button
                                type="button"
                                className="btn-icon btn-icon-danger"
                                title="Deactivate Head Office"
                                onClick={() =>
                                  setConfirmItem({ item, action: 'deactivate' })
                                }
                              >
                                <XCircle size={16} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn-icon btn-icon-success"
                                title="Activate Head Office"
                                onClick={() =>
                                  setConfirmItem({ item, action: 'activate' })
                                }
                              >
                                <CheckCircle size={16} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer-bar">
          <span>Enterprise Head Offices Directory</span>
          <span>Status filter: {includeInactive ? 'All Records' : 'Active Only'}</span>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => !isSubmitting && setIsFormOpen(false)}
        title={editingItem ? `Edit Head Office: ${editingItem.name}` : 'New Head Office'}
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
              onClick={handleSubmitForm}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Saving...'
                : editingItem
                ? 'Save Changes'
                : 'Create Head Office'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmitForm} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="code">
              Head Office Code <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <input
              id="code"
              type="text"
              className="form-input"
              placeholder="e.g. HO-KHI, HO-LHR"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value.toUpperCase() })
              }
              disabled={isSubmitting}
              maxLength={50}
              required
            />
            {formErrors.code && <div className="form-error">{formErrors.code}</div>}
            <div className="form-hint">
              Unique identifier code for headquarters. Max 50 characters.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="name">
              Head Office Name <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <input
              id="name"
              type="text"
              className="form-input"
              placeholder="e.g. Bait-us-Salam Central Secretariat"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isSubmitting}
              maxLength={200}
              required
            />
            {formErrors.name && <div className="form-error">{formErrors.name}</div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="info@baitussalam.org"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isSubmitting}
                maxLength={150}
              />
              {formErrors.email && <div className="form-error">{formErrors.email}</div>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="phone">
                Phone Number
              </label>
              <input
                id="phone"
                type="text"
                className="form-input"
                placeholder="+92 21 111-287-111"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={isSubmitting}
                maxLength={50}
              />
              {formErrors.phone && <div className="form-error">{formErrors.phone}</div>}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="address">
              Physical Address
            </label>
            <textarea
              id="address"
              className="form-input"
              rows={3}
              placeholder="Enter building number, street, sector, city..."
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              disabled={isSubmitting}
              maxLength={500}
            />
            {formErrors.address && <div className="form-error">{formErrors.address}</div>}
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={!!viewingItem}
        onClose={() => setViewingItem(null)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={20} className="text-primary" />
            <span>Head Office Profile</span>
          </div>
        }
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
          <div className="detail-grid">
            <div className="detail-item">
              <div className="detail-label">Head Office Code</div>
              <div className="detail-value">
                <span className="code-badge">{viewingItem.code}</span>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Status</div>
              <div className="detail-value">
                {viewingItem.isActive ? (
                  <span className="badge badge-success">Active</span>
                ) : (
                  <span className="badge badge-danger">Inactive</span>
                )}
              </div>
            </div>

            <div className="detail-item full-width">
              <div className="detail-label">Head Office Name</div>
              <div className="detail-value" style={{ fontWeight: 600 }}>
                {viewingItem.name}
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Email</div>
              <div className="detail-value">{viewingItem.email || '—'}</div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Phone</div>
              <div className="detail-value">{viewingItem.phone || '—'}</div>
            </div>

            <div className="detail-item full-width">
              <div className="detail-label">Physical Address</div>
              <div className="detail-value">{viewingItem.address || '—'}</div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Internal ID</div>
              <div className="detail-value">#{viewingItem.id}</div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Registration Date</div>
              <div className="detail-value">
                {new Date(viewingItem.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Dialog for Activate/Deactivate */}
      {confirmItem && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setConfirmItem(null)}
          onConfirm={handleConfirmStatusChange}
          isLoading={isSubmitting}
          title={
            confirmItem.action === 'deactivate'
              ? 'Deactivate Head Office'
              : 'Activate Head Office'
          }
          message={
            confirmItem.action === 'deactivate'
              ? `Are you sure you want to deactivate "${confirmItem.item.name}"? Note: Head offices cannot be deactivated if they have active branches.`
              : `Are you sure you want to activate "${confirmItem.item.name}"?`
          }
          confirmLabel={
            confirmItem.action === 'deactivate'
              ? 'Yes, Deactivate'
              : 'Yes, Activate'
          }
          variant={confirmItem.action === 'deactivate' ? 'danger' : 'success'}
        />
      )}
    </div>
  );
};
