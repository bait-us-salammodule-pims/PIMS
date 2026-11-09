import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Layers,
  Plus,
  RefreshCw,
  Search,
  Edit2,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lock,
  GitBranch,
} from 'lucide-react';
import { organizationService } from '../../api/organizationService';
import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import type {
  Department,
  DepartmentFormData,
  Branch,
} from '../../types/organization';

export const DepartmentsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canView = hasPermission('OrganizationView');
  const canManage = hasPermission('OrganizationManage');

  // State
  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [selectedBranchId, setSelectedBranchId] = useState<number | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Department | null>(null);
  const [viewingItem, setViewingItem] = useState<Department | null>(null);
  const [confirmItem, setConfirmItem] = useState<{
    item: Department;
    action: 'activate' | 'deactivate';
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields & Validation
  const [formData, setFormData] = useState<DepartmentFormData>({
    branchId: 0,
    code: '',
    name: '',
    description: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch branches for filter & parent selection
  const loadBranches = useCallback(async () => {
    try {
      const data = await organizationService.getBranches(undefined, true);
      setBranches(data);
    } catch (err) {
      console.error('Failed to load branches dropdown options:', err);
    }
  }, []);

  // Fetch departments with branch filter
  const loadDepartments = useCallback(async () => {
    if (!canView) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const brId = typeof selectedBranchId === 'number' && selectedBranchId > 0
        ? selectedBranchId
        : undefined;

      const data = await organizationService.getDepartments(brId, includeInactive);
      setDepartments(data);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to retrieve departments.'));
    } finally {
      setIsLoading(false);
    }
  }, [canView, selectedBranchId, includeInactive]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  // Client-side search filtering
  const filteredDepartments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return departments;
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        d.branchName.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q)
    );
  }, [departments, searchQuery]);

  // Active branches for Create Form dropdown
  const activeBranches = useMemo(
    () => branches.filter((b) => b.isActive),
    [branches]
  );

  // Form Handlers
  const handleOpenCreate = () => {
    setEditingItem(null);
    const defaultBranchId = typeof selectedBranchId === 'number' && selectedBranchId > 0
      ? selectedBranchId
      : activeBranches.length > 0
      ? activeBranches[0].id
      : 0;

    setFormData({
      branchId: defaultBranchId,
      code: '',
      name: '',
      description: '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: Department) => {
    setEditingItem(item);
    setFormData({
      branchId: item.branchId,
      code: item.code,
      name: item.name,
      description: item.description || '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!editingItem && (!formData.branchId || formData.branchId <= 0)) {
      errors.branchId = 'Please select a parent branch.';
    }

    if (!formData.code.trim()) {
      errors.code = 'Department code is required.';
    } else if (formData.code.trim().length > 50) {
      errors.code = 'Code cannot exceed 50 characters.';
    }

    if (!formData.name.trim()) {
      errors.name = 'Department name is required.';
    } else if (formData.name.trim().length > 200) {
      errors.name = 'Name cannot exceed 200 characters.';
    }

    if (formData.description?.trim() && formData.description.trim().length > 500) {
      errors.description = 'Description cannot exceed 500 characters.';
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
        await organizationService.updateDepartment(editingItem.id, formData);
        setSuccessMessage(`Department "${formData.name.trim()}" updated successfully.`);
      } else {
        await organizationService.createDepartment(formData);
        setSuccessMessage(`Department "${formData.name.trim()}" created successfully.`);
      }
      setIsFormOpen(false);
      loadDepartments();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to save department.'));
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
        await organizationService.deactivateDepartment(item.id);
        setSuccessMessage(`Department "${item.name}" deactivated successfully.`);
      } else {
        await organizationService.activateDepartment(item.id);
        setSuccessMessage(`Department "${item.name}" activated successfully.`);
      }
      setConfirmItem(null);
      loadDepartments();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, `Failed to ${action} department.`));
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
            You do not have the <code>OrganizationView</code> permission required to view departments.
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
            <Layers size={26} className="text-primary" />
            <span>Departments</span>
          </h1>
          <p className="page-subtitle">
            Configure functional departments within organizational branches.
          </p>
        </div>

        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadDepartments}
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
              <span>New Department</span>
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
          {/* Branch Filter */}
          <select
            className="filter-select"
            value={selectedBranchId}
            onChange={(e) =>
              setSelectedBranchId(e.target.value ? Number(e.target.value) : '')
            }
            title="Filter by Branch"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code}) {!b.isActive ? '[Inactive]' : ''}
              </option>
            ))}
          </select>

          {/* Search Input */}
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search department name, code, description..."
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
          Showing <strong>{filteredDepartments.length}</strong> of{' '}
          <strong>{departments.length}</strong> records
        </div>
      </div>

      {/* Data Table */}
      <div className="data-table-container">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '120px' }}>Code</th>
                <th>Department Name</th>
                <th>Parent Branch</th>
                <th>Description</th>
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
                      <span>Loading departments from server...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDepartments.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="table-empty-state">
                      <div className="empty-state-icon">
                        <Layers size={28} />
                      </div>
                      <div className="empty-state-title">No Departments Found</div>
                      <div className="empty-state-desc">
                        {searchQuery || selectedBranchId
                          ? 'No departments match your active search or branch filter.'
                          : 'No departments have been configured under this branch yet.'}
                      </div>
                      {canManage && !searchQuery && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={handleOpenCreate}
                        >
                          <Plus size={15} />
                          <span>Create First Department</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDepartments.map((item) => (
                  <tr key={item.id} className={!item.isActive ? 'row-inactive' : ''}>
                    <td>
                      <span className="code-badge">{item.code}</span>
                    </td>
                    <td>
                      <span className="record-name-text">{item.name}</span>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--navy-700)' }}>
                        <GitBranch size={13} className="text-muted" />
                        <span>{item.branchName || `Branch #${item.branchId}`}</span>
                      </span>
                    </td>
                    <td>
                      <span style={{ color: item.description ? 'var(--navy-700)' : 'var(--text-light)', fontSize: '0.8125rem' }}>
                        {item.description || '—'}
                      </span>
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
                                title="Deactivate Department"
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
                                title="Activate Department"
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
          <span>Enterprise Departments Directory</span>
          <span>Status filter: {includeInactive ? 'All Records' : 'Active Only'}</span>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => !isSubmitting && setIsFormOpen(false)}
        title={editingItem ? `Edit Department: ${editingItem.name}` : 'New Department'}
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
                : 'Create Department'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmitForm} noValidate>
          {/* Branch Selector */}
          <div className="form-group">
            <label className="form-label" htmlFor="branchId">
              Parent Branch <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            {editingItem ? (
              <input
                id="branchId"
                type="text"
                className="form-input"
                value={editingItem.branchName || `Branch #${editingItem.branchId}`}
                disabled
              />
            ) : (
              <select
                id="branchId"
                className="filter-select"
                style={{ width: '100%', backgroundColor: '#ffffff' }}
                value={formData.branchId}
                onChange={(e) =>
                  setFormData({ ...formData, branchId: Number(e.target.value) })
                }
                disabled={isSubmitting}
                required
              >
                <option value={0}>-- Select Branch --</option>
                {activeBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            )}
            {formErrors.branchId && (
              <div className="form-error">{formErrors.branchId}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="code">
              Department Code <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <input
              id="code"
              type="text"
              className="form-input"
              placeholder="e.g. DEPT-ACCT, DEPT-IT, DEPT-LOG"
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
              Must be unique within the selected branch. Max 50 characters.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="name">
              Department Name <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <input
              id="name"
              type="text"
              className="form-input"
              placeholder="e.g. Accounts & Finance, Logistics & Store"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isSubmitting}
              maxLength={200}
              required
            />
            {formErrors.name && <div className="form-error">{formErrors.name}</div>}
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              className="form-input"
              rows={3}
              placeholder="Describe department responsibilities or operational scope..."
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={isSubmitting}
              maxLength={500}
            />
            {formErrors.description && (
              <div className="form-error">{formErrors.description}</div>
            )}
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={!!viewingItem}
        onClose={() => setViewingItem(null)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={20} className="text-primary" />
            <span>Department Profile</span>
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
              <div className="detail-label">Department Code</div>
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
              <div className="detail-label">Department Name</div>
              <div className="detail-value" style={{ fontWeight: 600 }}>
                {viewingItem.name}
              </div>
            </div>

            <div className="detail-item full-width">
              <div className="detail-label">Parent Branch</div>
              <div className="detail-value" style={{ color: 'var(--blue-600)', fontWeight: 600 }}>
                {viewingItem.branchName || `Branch #${viewingItem.branchId}`}
              </div>
            </div>

            <div className="detail-item full-width">
              <div className="detail-label">Description</div>
              <div className="detail-value">{viewingItem.description || '—'}</div>
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
              ? 'Deactivate Department'
              : 'Activate Department'
          }
          message={
            confirmItem.action === 'deactivate'
              ? `Are you sure you want to deactivate "${confirmItem.item.name}"? Note: Departments cannot be deactivated if they have active sub-departments.`
              : `Are you sure you want to activate "${confirmItem.item.name}"? Note: Departments cannot be activated if their parent branch is inactive.`
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
