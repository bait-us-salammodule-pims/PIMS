import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  FolderTree,
  Plus,
  RefreshCw,
  Search,
  Edit2,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lock,
  Layers,
} from 'lucide-react';
import { organizationService } from '../../api/organizationService';
import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import type {
  SubDepartment,
  SubDepartmentFormData,
  Department,
} from '../../types/organization';

export const SubDepartmentsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canView = hasPermission('OrganizationView');
  const canManage = hasPermission('OrganizationManage');

  // State
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SubDepartment | null>(null);
  const [viewingItem, setViewingItem] = useState<SubDepartment | null>(null);
  const [confirmItem, setConfirmItem] = useState<{
    item: SubDepartment;
    action: 'activate' | 'deactivate';
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields & Validation
  const [formData, setFormData] = useState<SubDepartmentFormData>({
    departmentId: 0,
    code: '',
    name: '',
    description: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch departments for filter & parent dropdown
  const loadDepartments = useCallback(async () => {
    try {
      const data = await organizationService.getDepartments(undefined, true);
      setDepartments(data);
    } catch (err) {
      console.error('Failed to load departments dropdown options:', err);
    }
  }, []);

  // Fetch sub-departments with department filter
  const loadSubDepartments = useCallback(async () => {
    if (!canView) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const deptId = typeof selectedDepartmentId === 'number' && selectedDepartmentId > 0
        ? selectedDepartmentId
        : undefined;

      const data = await organizationService.getSubDepartments(deptId, includeInactive);
      setSubDepartments(data);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to retrieve sub-departments.'));
    } finally {
      setIsLoading(false);
    }
  }, [canView, selectedDepartmentId, includeInactive]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    loadSubDepartments();
  }, [loadSubDepartments]);

  // Client-side search filtering
  const filteredSubDepartments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return subDepartments;
    return subDepartments.filter(
      (sd) =>
        sd.name.toLowerCase().includes(q) ||
        sd.code.toLowerCase().includes(q) ||
        sd.departmentName.toLowerCase().includes(q) ||
        sd.description?.toLowerCase().includes(q)
    );
  }, [subDepartments, searchQuery]);

  // Active departments for Create Form dropdown
  const activeDepartments = useMemo(
    () => departments.filter((d) => d.isActive),
    [departments]
  );

  // Form Handlers
  const handleOpenCreate = () => {
    setEditingItem(null);
    const defaultDeptId = typeof selectedDepartmentId === 'number' && selectedDepartmentId > 0
      ? selectedDepartmentId
      : activeDepartments.length > 0
      ? activeDepartments[0].id
      : 0;

    setFormData({
      departmentId: defaultDeptId,
      code: '',
      name: '',
      description: '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: SubDepartment) => {
    setEditingItem(item);
    setFormData({
      departmentId: item.departmentId,
      code: item.code,
      name: item.name,
      description: item.description || '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!editingItem && (!formData.departmentId || formData.departmentId <= 0)) {
      errors.departmentId = 'Please select a parent department.';
    }

    if (!formData.code.trim()) {
      errors.code = 'Sub-department code is required.';
    } else if (formData.code.trim().length > 50) {
      errors.code = 'Code cannot exceed 50 characters.';
    }

    if (!formData.name.trim()) {
      errors.name = 'Sub-department name is required.';
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
        await organizationService.updateSubDepartment(editingItem.id, formData);
        setSuccessMessage(`Sub-department "${formData.name.trim()}" updated successfully.`);
      } else {
        await organizationService.createSubDepartment(formData);
        setSuccessMessage(`Sub-department "${formData.name.trim()}" created successfully.`);
      }
      setIsFormOpen(false);
      loadSubDepartments();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to save sub-department.'));
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
        await organizationService.deactivateSubDepartment(item.id);
        setSuccessMessage(`Sub-department "${item.name}" deactivated successfully.`);
      } else {
        await organizationService.activateSubDepartment(item.id);
        setSuccessMessage(`Sub-department "${item.name}" activated successfully.`);
      }
      setConfirmItem(null);
      loadSubDepartments();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, `Failed to ${action} sub-department.`));
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
            You do not have the <code>OrganizationView</code> permission required to view sub-departments.
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
            <FolderTree size={26} className="text-primary" />
            <span>Sub-Departments</span>
          </h1>
          <p className="page-subtitle">
            Manage functional divisions, working units, and specialized teams.
          </p>
        </div>

        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadSubDepartments}
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
              <span>New Sub-Department</span>
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
          {/* Department Filter */}
          <select
            className="filter-select"
            value={selectedDepartmentId}
            onChange={(e) =>
              setSelectedDepartmentId(e.target.value ? Number(e.target.value) : '')
            }
            title="Filter by Department"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code}) {!d.isActive ? '[Inactive]' : ''}
              </option>
            ))}
          </select>

          {/* Search Input */}
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search sub-department name, code, description..."
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
          Showing <strong>{filteredSubDepartments.length}</strong> of{' '}
          <strong>{subDepartments.length}</strong> records
        </div>
      </div>

      {/* Data Table */}
      <div className="data-table-container">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '120px' }}>Code</th>
                <th>Sub-Department Name</th>
                <th>Parent Department</th>
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
                      <span>Loading sub-departments from server...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSubDepartments.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="table-empty-state">
                      <div className="empty-state-icon">
                        <FolderTree size={28} />
                      </div>
                      <div className="empty-state-title">No Sub-Departments Found</div>
                      <div className="empty-state-desc">
                        {searchQuery || selectedDepartmentId
                          ? 'No sub-departments match your active search or department filter.'
                          : 'No sub-departments have been configured under this department yet.'}
                      </div>
                      {canManage && !searchQuery && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={handleOpenCreate}
                        >
                          <Plus size={15} />
                          <span>Create First Sub-Department</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSubDepartments.map((item) => (
                  <tr key={item.id} className={!item.isActive ? 'row-inactive' : ''}>
                    <td>
                      <span className="code-badge">{item.code}</span>
                    </td>
                    <td>
                      <span className="record-name-text">{item.name}</span>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--navy-700)' }}>
                        <Layers size={13} className="text-muted" />
                        <span>{item.departmentName || `Department #${item.departmentId}`}</span>
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
                                title="Deactivate Sub-Department"
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
                                title="Activate Sub-Department"
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
          <span>Enterprise Sub-Departments Directory</span>
          <span>Status filter: {includeInactive ? 'All Records' : 'Active Only'}</span>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => !isSubmitting && setIsFormOpen(false)}
        title={editingItem ? `Edit Sub-Department: ${editingItem.name}` : 'New Sub-Department'}
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
                : 'Create Sub-Department'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmitForm} noValidate>
          {/* Department Selector */}
          <div className="form-group">
            <label className="form-label" htmlFor="departmentId">
              Parent Department <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            {editingItem ? (
              <input
                id="departmentId"
                type="text"
                className="form-input"
                value={editingItem.departmentName || `Department #${editingItem.departmentId}`}
                disabled
              />
            ) : (
              <select
                id="departmentId"
                className="filter-select"
                style={{ width: '100%', backgroundColor: '#ffffff' }}
                value={formData.departmentId}
                onChange={(e) =>
                  setFormData({ ...formData, departmentId: Number(e.target.value) })
                }
                disabled={isSubmitting}
                required
              >
                <option value={0}>-- Select Department --</option>
                {activeDepartments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            )}
            {formErrors.departmentId && (
              <div className="form-error">{formErrors.departmentId}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="code">
              Sub-Department Code <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <input
              id="code"
              type="text"
              className="form-input"
              placeholder="e.g. SUB-PAYROLL, SUB-NETWORKING"
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
              Must be unique within the selected department. Max 50 characters.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="name">
              Sub-Department Name <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <input
              id="name"
              type="text"
              className="form-input"
              placeholder="e.g. Payroll Operations, Network Security"
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
              placeholder="Describe sub-department scope or duties..."
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
            <FolderTree size={20} className="text-primary" />
            <span>Sub-Department Profile</span>
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
              <div className="detail-label">Sub-Department Code</div>
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
              <div className="detail-label">Sub-Department Name</div>
              <div className="detail-value" style={{ fontWeight: 600 }}>
                {viewingItem.name}
              </div>
            </div>

            <div className="detail-item full-width">
              <div className="detail-label">Parent Department</div>
              <div className="detail-value" style={{ color: 'var(--blue-600)', fontWeight: 600 }}>
                {viewingItem.departmentName || `Department #${viewingItem.departmentId}`}
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
              ? 'Deactivate Sub-Department'
              : 'Activate Sub-Department'
          }
          message={
            confirmItem.action === 'deactivate'
              ? `Are you sure you want to deactivate "${confirmItem.item.name}"?`
              : `Are you sure you want to activate "${confirmItem.item.name}"? Note: Sub-departments cannot be activated if their parent department is inactive.`
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
