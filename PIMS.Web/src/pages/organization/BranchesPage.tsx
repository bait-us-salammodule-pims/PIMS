import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  GitBranch,
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
  Building2,
} from 'lucide-react';
import { organizationService } from '../../api/organizationService';
import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import type {
  Branch,
  BranchFormData,
  HeadOffice,
} from '../../types/organization';

export const BranchesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canView = hasPermission('OrganizationView');
  const canManage = hasPermission('OrganizationManage');

  // State
  const [branches, setBranches] = useState<Branch[]>([]);
  const [headOffices, setHeadOffices] = useState<HeadOffice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [selectedHeadOfficeId, setSelectedHeadOfficeId] = useState<number | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Branch | null>(null);
  const [viewingItem, setViewingItem] = useState<Branch | null>(null);
  const [confirmItem, setConfirmItem] = useState<{
    item: Branch;
    action: 'activate' | 'deactivate';
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields & Validation
  const [formData, setFormData] = useState<BranchFormData>({
    headOfficeId: 0,
    code: '',
    name: '',
    address: '',
    phone: '',
    email: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch Head Offices for filter & dropdowns
  const loadHeadOffices = useCallback(async () => {
    try {
      // Include inactive so we can display parent names even for inactive parents
      const data = await organizationService.getHeadOffices(true);
      setHeadOffices(data);
    } catch (err) {
      console.error('Failed to load head offices dropdown options:', err);
    }
  }, []);

  // Fetch branches with backend filter support
  const loadBranches = useCallback(async () => {
    if (!canView) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const hoId = typeof selectedHeadOfficeId === 'number' && selectedHeadOfficeId > 0
        ? selectedHeadOfficeId
        : undefined;

      const data = await organizationService.getBranches(hoId, includeInactive);
      setBranches(data);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to retrieve branches.'));
    } finally {
      setIsLoading(false);
    }
  }, [canView, selectedHeadOfficeId, includeInactive]);

  useEffect(() => {
    loadHeadOffices();
  }, [loadHeadOffices]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  // Client-side search filtering
  const filteredBranches = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return branches;
    return branches.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        b.headOfficeName.toLowerCase().includes(q) ||
        b.email?.toLowerCase().includes(q) ||
        b.phone?.toLowerCase().includes(q) ||
        b.address?.toLowerCase().includes(q)
    );
  }, [branches, searchQuery]);

  // Active Head Offices for Form Creation
  const activeHeadOffices = useMemo(
    () => headOffices.filter((ho) => ho.isActive),
    [headOffices]
  );

  // Form Handlers
  const handleOpenCreate = () => {
    setEditingItem(null);
    // Pre-select head office if currently filtered
    const defaultHoId = typeof selectedHeadOfficeId === 'number' && selectedHeadOfficeId > 0
      ? selectedHeadOfficeId
      : activeHeadOffices.length > 0
      ? activeHeadOffices[0].id
      : 0;

    setFormData({
      headOfficeId: defaultHoId,
      code: '',
      name: '',
      address: '',
      phone: '',
      email: '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: Branch) => {
    setEditingItem(item);
    setFormData({
      headOfficeId: item.headOfficeId,
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

    if (!editingItem && (!formData.headOfficeId || formData.headOfficeId <= 0)) {
      errors.headOfficeId = 'Please select a parent head office.';
    }

    if (!formData.code.trim()) {
      errors.code = 'Branch code is required.';
    } else if (formData.code.trim().length > 50) {
      errors.code = 'Code cannot exceed 50 characters.';
    }

    if (!formData.name.trim()) {
      errors.name = 'Branch name is required.';
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
        await organizationService.updateBranch(editingItem.id, formData);
        setSuccessMessage(`Branch "${formData.name.trim()}" updated successfully.`);
      } else {
        await organizationService.createBranch(formData);
        setSuccessMessage(`Branch "${formData.name.trim()}" created successfully.`);
      }
      setIsFormOpen(false);
      loadBranches();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to save branch.'));
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
        await organizationService.deactivateBranch(item.id);
        setSuccessMessage(`Branch "${item.name}" deactivated successfully.`);
      } else {
        await organizationService.activateBranch(item.id);
        setSuccessMessage(`Branch "${item.name}" activated successfully.`);
      }
      setConfirmItem(null);
      loadBranches();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, `Failed to ${action} branch.`));
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
            You do not have the <code>OrganizationView</code> permission required to view branches.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header-row">
        <div className="page-title-group">
          <h1 className="page-main-title">
            <GitBranch size={26} className="text-primary" />
            <span>Branches &amp; Campuses</span>
          </h1>
          <p className="page-subtitle">
            Manage regional operating branches, campus locations, and physical facilities.
          </p>
        </div>

        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadBranches}
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
              <span>New Branch</span>
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

      {/* Filter & Search Bar */}
      <div className="filter-card">
        <div className="filter-controls-group">
          {/* Head Office Filter */}
          <select
            className="filter-select"
            value={selectedHeadOfficeId}
            onChange={(e) =>
              setSelectedHeadOfficeId(e.target.value ? Number(e.target.value) : '')
            }
            title="Filter by Head Office"
          >
            <option value="">All Head Offices</option>
            {headOffices.map((ho) => (
              <option key={ho.id} value={ho.id}>
                {ho.name} ({ho.code}) {!ho.isActive ? '[Inactive]' : ''}
              </option>
            ))}
          </select>

          {/* Search Input */}
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search branch name, code, contact..."
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
          Showing <strong>{filteredBranches.length}</strong> of{' '}
          <strong>{branches.length}</strong> records
        </div>
      </div>

      {/* Data Table */}
      <div className="data-table-container">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '120px' }}>Code</th>
                <th>Branch Name</th>
                <th>Parent Head Office</th>
                <th>Contact</th>
                <th>Address</th>
                <th style={{ width: '100px' }}>Status</th>
                <th style={{ width: '120px' }}>Created</th>
                <th style={{ width: '140px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Loading branches from server...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredBranches.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="table-empty-state">
                      <div className="empty-state-icon">
                        <GitBranch size={28} />
                      </div>
                      <div className="empty-state-title">No Branches Found</div>
                      <div className="empty-state-desc">
                        {searchQuery || selectedHeadOfficeId
                          ? 'No branches match your active search or head office filter.'
                          : 'No branches have been registered under this head office yet.'}
                      </div>
                      {canManage && !searchQuery && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={handleOpenCreate}
                        >
                          <Plus size={15} />
                          <span>Create First Branch</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBranches.map((item) => (
                  <tr key={item.id} className={!item.isActive ? 'row-inactive' : ''}>
                    <td>
                      <span className="code-badge">{item.code}</span>
                    </td>
                    <td>
                      <span className="record-name-text">{item.name}</span>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--navy-700)' }}>
                        <Building2 size={13} className="text-muted" />
                        <span>{item.headOfficeName || `HO #${item.headOfficeId}`}</span>
                      </span>
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
                            maxWidth: '200px',
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
                                title="Deactivate Branch"
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
                                title="Activate Branch"
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
          <span>Enterprise Regional Branches</span>
          <span>Status filter: {includeInactive ? 'All Records' : 'Active Only'}</span>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => !isSubmitting && setIsFormOpen(false)}
        title={editingItem ? `Edit Branch: ${editingItem.name}` : 'New Branch'}
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
                : 'Create Branch'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmitForm} noValidate>
          {/* Head Office Selector (Enabled on Create, fixed on Edit) */}
          <div className="form-group">
            <label className="form-label" htmlFor="headOfficeId">
              Parent Head Office <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            {editingItem ? (
              <input
                id="headOfficeId"
                type="text"
                className="form-input"
                value={editingItem.headOfficeName || `HO #${editingItem.headOfficeId}`}
                disabled
              />
            ) : (
              <select
                id="headOfficeId"
                className="filter-select"
                style={{ width: '100%', backgroundColor: '#ffffff' }}
                value={formData.headOfficeId}
                onChange={(e) =>
                  setFormData({ ...formData, headOfficeId: Number(e.target.value) })
                }
                disabled={isSubmitting}
                required
              >
                <option value={0}>-- Select Head Office --</option>
                {activeHeadOffices.map((ho) => (
                  <option key={ho.id} value={ho.id}>
                    {ho.name} ({ho.code})
                  </option>
                ))}
              </select>
            )}
            {formErrors.headOfficeId && (
              <div className="form-error">{formErrors.headOfficeId}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="code">
              Branch Code <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <input
              id="code"
              type="text"
              className="form-input"
              placeholder="e.g. BR-KHI-01, BR-ISB"
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
              Must be unique within the selected head office. Max 50 characters.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="name">
              Branch Name <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <input
              id="name"
              type="text"
              className="form-input"
              placeholder="e.g. Bait-us-Salam Main Campus"
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
                Branch Email
              </label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="branch@baitussalam.org"
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
                placeholder="+92 21 34567890"
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
              Branch Physical Address
            </label>
            <textarea
              id="address"
              className="form-input"
              rows={3}
              placeholder="Enter building details, sector, plot, city..."
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
            <GitBranch size={20} className="text-primary" />
            <span>Branch Profile</span>
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
              <div className="detail-label">Branch Code</div>
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
              <div className="detail-label">Branch Name</div>
              <div className="detail-value" style={{ fontWeight: 600 }}>
                {viewingItem.name}
              </div>
            </div>

            <div className="detail-item full-width">
              <div className="detail-label">Parent Head Office</div>
              <div className="detail-value" style={{ color: 'var(--blue-600)', fontWeight: 600 }}>
                {viewingItem.headOfficeName || `Head Office #${viewingItem.headOfficeId}`}
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
              <div className="detail-label">Address</div>
              <div className="detail-value">{viewingItem.address || '—'}</div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Internal ID</div>
              <div className="detail-value">#{viewingItem.id}</div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Created Date</div>
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
              ? 'Deactivate Branch'
              : 'Activate Branch'
          }
          message={
            confirmItem.action === 'deactivate'
              ? `Are you sure you want to deactivate "${confirmItem.item.name}"? Note: Branches cannot be deactivated if they have active departments.`
              : `Are you sure you want to activate "${confirmItem.item.name}"? Note: Branches cannot be activated if their parent head office is inactive.`
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
