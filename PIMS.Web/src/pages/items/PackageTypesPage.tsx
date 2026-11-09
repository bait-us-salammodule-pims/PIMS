import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Boxes,
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
} from 'lucide-react';
import { itemService } from '../../api/itemService';
import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import type {
  PackageType,
  PackageTypeFormData,
  CreatePackageTypeRequest,
  UpdatePackageTypeRequest,
} from '../../types/item';

export const PackageTypesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canView = hasPermission('ItemView');
  const canCreate = hasPermission('ItemCreate');
  const canUpdate = hasPermission('ItemUpdate');
  const canDeactivate = hasPermission('ItemDeactivate');

  // State
  const [packageTypes, setPackageTypes] = useState<PackageType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PackageType | null>(null);
  const [viewingItem, setViewingItem] = useState<PackageType | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<PackageType | null>(null);
  const [toggleConfirmItem, setToggleConfirmItem] = useState<PackageType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields & Validation
  const [formData, setFormData] = useState<PackageTypeFormData>({
    name: '',
    code: '',
    description: '',
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Load Package Types
  const loadPackageTypes = useCallback(async () => {
    if (!canView) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await itemService.getPackageTypes();
      setPackageTypes(data);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to load package types.'));
    } finally {
      setIsLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    loadPackageTypes();
  }, [loadPackageTypes]);

  // Filtered List
  const filteredPackageTypes = useMemo(() => {
    return packageTypes.filter((pt) => {
      if (!includeInactive && !pt.isActive) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = pt.name.toLowerCase().includes(query);
        const matchesCode = pt.code.toLowerCase().includes(query);
        const matchesDesc = pt.description?.toLowerCase().includes(query) ?? false;
        return matchesName || matchesCode || matchesDesc;
      }

      return true;
    });
  }, [packageTypes, includeInactive, searchQuery]);

  // Form Handlers
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      isActive: true,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: PackageType) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      code: item.code,
      description: item.description || '',
      isActive: item.isActive,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Package type name is required.';
    } else if (formData.name.trim().length > 100) {
      errors.name = 'Package type name cannot exceed 100 characters.';
    }

    if (!formData.code.trim()) {
      errors.code = 'Package type code is required.';
    } else if (formData.code.trim().length > 20) {
      errors.code = 'Package type code cannot exceed 20 characters.';
    }

    if (formData.description && formData.description.length > 500) {
      errors.description = 'Description cannot exceed 500 characters.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (editingItem) {
        const updatePayload: UpdatePackageTypeRequest = {
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          description: formData.description.trim() || null,
          isActive: formData.isActive,
        };
        const updated = await itemService.updatePackageType(editingItem.id, updatePayload);
        setPackageTypes((prev) => prev.map((pt) => (pt.id === updated.id ? updated : pt)));
        setSuccessMessage(`Package type "${updated.name}" updated successfully.`);
      } else {
        const createPayload: CreatePackageTypeRequest = {
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          description: formData.description.trim() || null,
        };
        const created = await itemService.createPackageType(createPayload);
        setPackageTypes((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        setSuccessMessage(`Package type "${created.name}" created successfully.`);
      }
      setIsFormOpen(false);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to save package type.'));
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
      const updated = await itemService.updatePackageType(toggleConfirmItem.id, {
        name: toggleConfirmItem.name,
        code: toggleConfirmItem.code,
        description: toggleConfirmItem.description,
        isActive: !toggleConfirmItem.isActive,
      });
      setPackageTypes((prev) => prev.map((pt) => (pt.id === updated.id ? updated : pt)));
      setSuccessMessage(
        `Package type "${updated.name}" has been ${updated.isActive ? 'activated' : 'deactivated'}.`
      );
      setToggleConfirmItem(null);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to update package type status.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Package Type
  const handleDelete = async () => {
    if (!deleteConfirmItem) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await itemService.deletePackageType(deleteConfirmItem.id);
      setPackageTypes((prev) => prev.filter((pt) => pt.id !== deleteConfirmItem.id));
      setSuccessMessage(`Package type "${deleteConfirmItem.name}" deleted successfully.`);
      setDeleteConfirmItem(null);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to delete package type.'));
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
          You do not have the required permission (<code>ItemView</code>) to view Package Types.
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
            <Boxes size={26} className="text-primary" />
            <span>Package Types</span>
          </h1>
          <p className="page-description">
            Packaging specifications and standard container configurations for shipping and storage.
          </p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadPackageTypes}
            disabled={isLoading}
            title="Refresh package types"
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
              <span>Add Package Type</span>
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
          {/* Search Input */}
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by package name, code, description..."
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
            <span>Show Inactive</span>
          </label>
        </div>

        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Showing <strong>{filteredPackageTypes.length}</strong> of <strong>{packageTypes.length}</strong> types
        </div>
      </div>

      {/* Data Table */}
      <div className="data-table-container">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Package Code</th>
                <th>Package Name</th>
                <th>Description</th>
                <th style={{ width: '100px' }}>Status</th>
                <th style={{ width: '120px' }}>Created</th>
                <th style={{ width: '140px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Loading package types...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPackageTypes.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="table-empty-state">
                      <div className="empty-state-icon">
                        <Boxes size={28} />
                      </div>
                      <div className="empty-state-title">No Package Types Found</div>
                      <div className="empty-state-desc">
                        {searchQuery
                          ? 'No package types match your search query.'
                          : 'No package types have been configured yet.'}
                      </div>
                      {canCreate && !searchQuery && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={handleOpenCreate}
                        >
                          <Plus size={15} />
                          <span>Add First Package Type</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPackageTypes.map((item) => (
                  <tr key={item.id} className={!item.isActive ? 'row-inactive' : ''}>
                    <td>
                      <span className="code-badge">{item.code}</span>
                    </td>
                    <td>
                      <span className="record-name-text">{item.name}</span>
                    </td>
                    <td>
                      <span
                        style={{
                          color: 'var(--navy-600)',
                          fontSize: '0.8125rem',
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {item.description || '—'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${item.isActive ? 'badge-success' : 'badge-inactive'}`}
                      >
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
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
                          onClick={() => setViewingItem(item)}
                          title="View package details"
                        >
                          <Eye size={15} />
                        </button>

                        {canUpdate && (
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit package type"
                          >
                            <Edit2 size={15} />
                          </button>
                        )}

                        {canDeactivate && (
                          <button
                            type="button"
                            className={`btn-icon ${
                              item.isActive ? 'text-warning' : 'text-success'
                            }`}
                            onClick={() => setToggleConfirmItem(item)}
                            title={item.isActive ? 'Deactivate package type' : 'Activate package type'}
                          >
                            {item.isActive ? <XCircle size={15} /> : <CheckCircle size={15} />}
                          </button>
                        )}

                        {canDeactivate && (
                          <button
                            type="button"
                            className="btn-icon text-danger"
                            onClick={() => setDeleteConfirmItem(item)}
                            title="Delete package type"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingItem ? `Edit Package Type: ${editingItem.name}` : 'Add Package Type'}
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
              {isSubmitting ? 'Saving...' : editingItem ? 'Update Package Type' : 'Create Package Type'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label required">Package Name</label>
            <input
              type="text"
              className={`form-input ${formErrors.name ? 'is-invalid' : ''}`}
              placeholder="e.g., Corrugated Box, Wooden Crate, Pallet, Poly Bag, Drum"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              maxLength={100}
            />
            {formErrors.name && <div className="form-feedback-error">{formErrors.name}</div>}
          </div>

          <div className="form-group">
            <label className="form-label required">Package Code</label>
            <input
              type="text"
              className={`form-input ${formErrors.code ? 'is-invalid' : ''}`}
              placeholder="e.g., BOX, CRATE, PLT, BAG, DRM"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              maxLength={20}
            />
            {formErrors.code && <div className="form-feedback-error">{formErrors.code}</div>}
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Unique uppercase code up to 20 characters.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className={`form-textarea ${formErrors.description ? 'is-invalid' : ''}`}
              rows={3}
              placeholder="Optional container dimensions, tare weight, handling requirements..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              maxLength={500}
            />
            {formErrors.description && (
              <div className="form-feedback-error">{formErrors.description}</div>
            )}
          </div>

          {editingItem && (
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="filter-checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <span>Active Status (Package type is available for logistics selection)</span>
              </label>
            </div>
          )}
        </form>
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={!!viewingItem}
        onClose={() => setViewingItem(null)}
        title="Package Type Details"
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
              <span className="details-label">Type ID</span>
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
              <span className="details-label">Package Name</span>
              <span className="details-value font-medium">{viewingItem.name}</span>
            </div>
            <div className="details-item">
              <span className="details-label">Code</span>
              <span className="details-value">
                <span className="code-badge">{viewingItem.code}</span>
              </span>
            </div>
            <div className="details-item" style={{ gridColumn: 'span 2' }}>
              <span className="details-label">Description</span>
              <span className="details-value">{viewingItem.description || '—'}</span>
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
        title={toggleConfirmItem?.isActive ? 'Deactivate Package Type' : 'Activate Package Type'}
        message={`Are you sure you want to ${
          toggleConfirmItem?.isActive ? 'deactivate' : 'activate'
        } package type "${toggleConfirmItem?.name}" (${toggleConfirmItem?.code})?`}
        confirmLabel={toggleConfirmItem?.isActive ? 'Deactivate' : 'Activate'}
        variant={toggleConfirmItem?.isActive ? 'warning' : 'success'}
        isLoading={isSubmitting}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirmItem}
        onClose={() => setDeleteConfirmItem(null)}
        onConfirm={handleDelete}
        title="Delete Package Type"
        message={`Are you sure you want to permanently delete package type "${deleteConfirmItem?.name}" (${deleteConfirmItem?.code})? This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        variant="danger"
        isLoading={isSubmitting}
      />
    </div>
  );
};
