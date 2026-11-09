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
  Trash2,
  Lock,
  Layers,
} from 'lucide-react';
import { itemService } from '../../api/itemService';
import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import type {
  ItemCategory,
  ItemCategoryFormData,
  CreateItemCategoryRequest,
  UpdateItemCategoryRequest,
} from '../../types/item';

export const ItemCategoriesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canView = hasPermission('ItemView');
  const canCreate = hasPermission('ItemCreate');
  const canUpdate = hasPermission('ItemUpdate');
  const canDeactivate = hasPermission('ItemDeactivate');

  // State
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParentFilter, setSelectedParentFilter] = useState<number | ''>('');
  const [includeInactive, setIncludeInactive] = useState(false);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemCategory | null>(null);
  const [viewingItem, setViewingItem] = useState<ItemCategory | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<ItemCategory | null>(null);
  const [toggleConfirmItem, setToggleConfirmItem] = useState<ItemCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields & Validation
  const [formData, setFormData] = useState<ItemCategoryFormData>({
    name: '',
    code: '',
    description: '',
    parentCategoryId: '',
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Map category ID to Name for display
  const categoryMap = useMemo(() => {
    const map = new Map<number, string>();
    categories.forEach((cat) => map.set(cat.id, cat.name));
    return map;
  }, [categories]);

  // Load Categories
  const loadCategories = useCallback(async () => {
    if (!canView) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await itemService.getCategories();
      setCategories(data);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to load item categories.'));
    } finally {
      setIsLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Filtered List
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      // Inactive filter
      if (!includeInactive && !cat.isActive) return false;

      // Parent filter
      if (selectedParentFilter !== '') {
        if (selectedParentFilter === 0) {
          // Root categories only (no parent)
          if (cat.parentCategoryId !== null) return false;
        } else if (cat.parentCategoryId !== selectedParentFilter) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = cat.name.toLowerCase().includes(query);
        const matchesCode = cat.code.toLowerCase().includes(query);
        const matchesDesc = cat.description?.toLowerCase().includes(query) ?? false;
        const parentName = cat.parentCategoryId ? categoryMap.get(cat.parentCategoryId) : '';
        const matchesParent = parentName ? parentName.toLowerCase().includes(query) : false;
        return matchesName || matchesCode || matchesDesc || matchesParent;
      }

      return true;
    });
  }, [categories, includeInactive, selectedParentFilter, searchQuery, categoryMap]);

  // Form Handlers
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      parentCategoryId: '',
      isActive: true,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: ItemCategory) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      code: item.code,
      description: item.description || '',
      parentCategoryId: item.parentCategoryId !== null ? item.parentCategoryId : '',
      isActive: item.isActive,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Category name is required.';
    } else if (formData.name.trim().length > 100) {
      errors.name = 'Category name cannot exceed 100 characters.';
    }

    if (!formData.code.trim()) {
      errors.code = 'Category code is required.';
    } else if (formData.code.trim().length > 50) {
      errors.code = 'Category code cannot exceed 50 characters.';
    }

    if (formData.description && formData.description.length > 500) {
      errors.description = 'Description cannot exceed 500 characters.';
    }

    if (editingItem && formData.parentCategoryId === editingItem.id) {
      errors.parentCategoryId = 'A category cannot be its own parent.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const parentId =
      typeof formData.parentCategoryId === 'number' && formData.parentCategoryId > 0
        ? formData.parentCategoryId
        : null;

    try {
      if (editingItem) {
        const updatePayload: UpdateItemCategoryRequest = {
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          description: formData.description.trim() || null,
          isActive: formData.isActive,
          parentCategoryId: parentId,
        };
        const updated = await itemService.updateCategory(editingItem.id, updatePayload);
        setCategories((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
        setSuccessMessage(`Category "${updated.name}" updated successfully.`);
      } else {
        const createPayload: CreateItemCategoryRequest = {
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          description: formData.description.trim() || null,
          parentCategoryId: parentId,
        };
        const created = await itemService.createCategory(createPayload);
        setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        setSuccessMessage(`Category "${created.name}" created successfully.`);
      }
      setIsFormOpen(false);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to save item category.'));
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
      const updated = await itemService.updateCategory(toggleConfirmItem.id, {
        name: toggleConfirmItem.name,
        code: toggleConfirmItem.code,
        description: toggleConfirmItem.description,
        isActive: !toggleConfirmItem.isActive,
        parentCategoryId: toggleConfirmItem.parentCategoryId,
      });
      setCategories((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      setSuccessMessage(
        `Category "${updated.name}" has been ${updated.isActive ? 'activated' : 'deactivated'}.`
      );
      setToggleConfirmItem(null);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to update category status.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Category
  const handleDelete = async () => {
    if (!deleteConfirmItem) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await itemService.deleteCategory(deleteConfirmItem.id);
      setCategories((prev) => prev.filter((c) => c.id !== deleteConfirmItem.id));
      setSuccessMessage(`Category "${deleteConfirmItem.name}" deleted successfully.`);
      setDeleteConfirmItem(null);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to delete category.'));
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
          You do not have the required permission (<code>ItemView</code>) to view Item Categories.
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
            <FolderTree size={26} className="text-primary" />
            <span>Item Categories</span>
          </h1>
          <p className="page-description">
            Hierarchical classification categories for grouping inventory items and products.
          </p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadCategories}
            disabled={isLoading}
            title="Refresh item categories"
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
              <span>Add Category</span>
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
          {/* Parent Category Filter */}
          <select
            className="filter-select"
            value={selectedParentFilter}
            onChange={(e) =>
              setSelectedParentFilter(e.target.value === '' ? '' : Number(e.target.value))
            }
            title="Filter by Parent Category"
          >
            <option value="">All Categories</option>
            <option value={0}>Root Categories Only (No Parent)</option>
            {categories
              .filter((c) => c.parentCategoryId === null)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  Parent: {c.name} ({c.code})
                </option>
              ))}
          </select>

          {/* Search Input */}
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search category name, code, parent..."
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
          Showing <strong>{filteredCategories.length}</strong> of{' '}
          <strong>{categories.length}</strong> categories
        </div>
      </div>

      {/* Data Table */}
      <div className="data-table-container">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Code</th>
                <th>Category Name</th>
                <th>Parent Category</th>
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
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Loading item categories...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="table-empty-state">
                      <div className="empty-state-icon">
                        <FolderTree size={28} />
                      </div>
                      <div className="empty-state-title">No Categories Found</div>
                      <div className="empty-state-desc">
                        {searchQuery || selectedParentFilter !== ''
                          ? 'No item categories match your search criteria.'
                          : 'No item categories have been configured yet.'}
                      </div>
                      {canCreate && !searchQuery && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={handleOpenCreate}
                        >
                          <Plus size={15} />
                          <span>Create First Category</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCategories.map((item) => {
                  const parentName = item.parentCategoryId
                    ? categoryMap.get(item.parentCategoryId) || `Category #${item.parentCategoryId}`
                    : null;

                  return (
                    <tr key={item.id} className={!item.isActive ? 'row-inactive' : ''}>
                      <td>
                        <span className="code-badge">{item.code}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span className="record-name-text">{item.name}</span>
                        </div>
                      </td>
                      <td>
                        {parentName ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--navy-700)' }}>
                            <Layers size={13} className="text-muted" />
                            <span>{parentName}</span>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                            — (Root)
                          </span>
                        )}
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
                            title="View details"
                          >
                            <Eye size={15} />
                          </button>

                          {canUpdate && (
                            <button
                              type="button"
                              className="btn-icon"
                              onClick={() => handleOpenEdit(item)}
                              title="Edit category"
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
                              title={item.isActive ? 'Deactivate category' : 'Activate category'}
                            >
                              {item.isActive ? <XCircle size={15} /> : <CheckCircle size={15} />}
                            </button>
                          )}

                          {canDeactivate && (
                            <button
                              type="button"
                              className="btn-icon text-danger"
                              onClick={() => setDeleteConfirmItem(item)}
                              title="Delete category"
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
        title={editingItem ? `Edit Category: ${editingItem.name}` : 'Create Item Category'}
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
              {isSubmitting ? 'Saving...' : editingItem ? 'Update Category' : 'Create Category'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label required">Category Name</label>
            <input
              type="text"
              className={`form-input ${formErrors.name ? 'is-invalid' : ''}`}
              placeholder="e.g., Raw Materials, Office Supplies, Electronics"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              maxLength={100}
            />
            {formErrors.name && <div className="form-feedback-error">{formErrors.name}</div>}
          </div>

          <div className="form-group">
            <label className="form-label required">Category Code</label>
            <input
              type="text"
              className={`form-input ${formErrors.code ? 'is-invalid' : ''}`}
              placeholder="e.g., RAW-MAT, OFF-SUP, ELEC"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              maxLength={50}
            />
            {formErrors.code && <div className="form-feedback-error">{formErrors.code}</div>}
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Unique alphanumeric code. Normalized to uppercase by backend.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Parent Category</label>
            <select
              className={`form-select ${formErrors.parentCategoryId ? 'is-invalid' : ''}`}
              value={formData.parentCategoryId}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  parentCategoryId: e.target.value === '' ? '' : Number(e.target.value),
                })
              }
            >
              <option value="">None (Top-Level Category)</option>
              {categories
                .filter((c) => !editingItem || c.id !== editingItem.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code}) {!c.isActive ? '[Inactive]' : ''}
                  </option>
                ))}
            </select>
            {formErrors.parentCategoryId && (
              <div className="form-feedback-error">{formErrors.parentCategoryId}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className={`form-textarea ${formErrors.description ? 'is-invalid' : ''}`}
              rows={3}
              placeholder="Optional notes or classification details..."
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
                <span>Active Status (Active categories are available for item selection)</span>
              </label>
            </div>
          )}
        </form>
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={!!viewingItem}
        onClose={() => setViewingItem(null)}
        title="Category Details"
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
              <span className="details-label">Category ID</span>
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
              <span className="details-label">Category Name</span>
              <span className="details-value font-medium">{viewingItem.name}</span>
            </div>
            <div className="details-item">
              <span className="details-label">Code</span>
              <span className="details-value">
                <span className="code-badge">{viewingItem.code}</span>
              </span>
            </div>
            <div className="details-item" style={{ gridColumn: 'span 2' }}>
              <span className="details-label">Parent Category</span>
              <span className="details-value">
                {viewingItem.parentCategoryId
                  ? `${categoryMap.get(viewingItem.parentCategoryId) || 'Category'} (#${viewingItem.parentCategoryId})`
                  : 'None (Top-Level Category)'}
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

      {/* Toggle Active Confirmation */}
      <ConfirmDialog
        isOpen={!!toggleConfirmItem}
        onClose={() => setToggleConfirmItem(null)}
        onConfirm={handleToggleStatus}
        title={toggleConfirmItem?.isActive ? 'Deactivate Category' : 'Activate Category'}
        message={`Are you sure you want to ${
          toggleConfirmItem?.isActive ? 'deactivate' : 'activate'
        } category "${toggleConfirmItem?.name}"? ${
          toggleConfirmItem?.isActive
            ? 'Inactive categories cannot be assigned to new items.'
            : ''
        }`}
        confirmLabel={toggleConfirmItem?.isActive ? 'Deactivate' : 'Activate'}
        variant={toggleConfirmItem?.isActive ? 'warning' : 'success'}
        isLoading={isSubmitting}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirmItem}
        onClose={() => setDeleteConfirmItem(null)}
        onConfirm={handleDelete}
        title="Delete Item Category"
        message={`Are you sure you want to permanently delete category "${deleteConfirmItem?.name}" (${deleteConfirmItem?.code})? This action cannot be undone. Note: Categories with subcategories cannot be deleted.`}
        confirmLabel="Delete Permanently"
        variant="danger"
        isLoading={isSubmitting}
      />
    </div>
  );
};
