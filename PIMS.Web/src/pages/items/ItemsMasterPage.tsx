import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Package,
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
  Barcode as BarcodeIcon,
  FolderTree,
} from 'lucide-react';
import { itemService } from '../../api/itemService';
import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import type {
  Item,
  ItemCategory,
  ItemFormData,
  CreateItemRequest,
  UpdateItemRequest,
} from '../../types/item';

export const ItemsMasterPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canView = hasPermission('ItemView');
  const canCreate = hasPermission('ItemCreate');
  const canUpdate = hasPermission('ItemUpdate');
  const canDeactivate = hasPermission('ItemDeactivate');

  // State
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number | ''>('');
  const [includeInactive, setIncludeInactive] = useState(false);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [viewingItem, setViewingItem] = useState<Item | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<Item | null>(null);
  const [toggleConfirmItem, setToggleConfirmItem] = useState<Item | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields & Validation
  const [formData, setFormData] = useState<ItemFormData>({
    itemCode: '',
    name: '',
    description: '',
    barcode: '',
    categoryId: '',
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Load Data
  const loadData = useCallback(async () => {
    if (!canView) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [itemsData, categoriesData] = await Promise.all([
        itemService.getItems(),
        itemService.getCategories(),
      ]);
      setItems(itemsData);
      setCategories(categoriesData);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to load items catalog data.'));
    } finally {
      setIsLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Inactive filter
      if (!includeInactive && !item.isActive) return false;

      // Category filter
      if (selectedCategoryFilter !== '' && item.categoryId !== selectedCategoryFilter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesCode = item.itemCode.toLowerCase().includes(query);
        const matchesCategory = item.categoryName.toLowerCase().includes(query);
        const matchesBarcode = item.barcode?.toLowerCase().includes(query) ?? false;
        const matchesDesc = item.description?.toLowerCase().includes(query) ?? false;
        return matchesName || matchesCode || matchesCategory || matchesBarcode || matchesDesc;
      }

      return true;
    });
  }, [items, includeInactive, selectedCategoryFilter, searchQuery]);

  // Form Handlers
  const handleOpenCreate = () => {
    setEditingItem(null);
    // Find first active category as default if available
    const firstActive = categories.find((c) => c.isActive);
    setFormData({
      itemCode: '',
      name: '',
      description: '',
      barcode: '',
      categoryId: firstActive ? firstActive.id : '',
      isActive: true,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({
      itemCode: item.itemCode,
      name: item.name,
      description: item.description || '',
      barcode: item.barcode || '',
      categoryId: item.categoryId,
      isActive: item.isActive,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.itemCode.trim()) {
      errors.itemCode = 'Item code is required.';
    } else if (formData.itemCode.trim().length > 50) {
      errors.itemCode = 'Item code cannot exceed 50 characters.';
    }

    if (!formData.name.trim()) {
      errors.name = 'Item name is required.';
    } else if (formData.name.trim().length > 200) {
      errors.name = 'Item name cannot exceed 200 characters.';
    }

    if (!formData.categoryId || typeof formData.categoryId !== 'number' || formData.categoryId <= 0) {
      errors.categoryId = 'Please select a valid item category.';
    }

    if (formData.barcode && formData.barcode.length > 100) {
      errors.barcode = 'Barcode cannot exceed 100 characters.';
    }

    if (formData.description && formData.description.length > 1000) {
      errors.description = 'Description cannot exceed 1000 characters.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const catId = formData.categoryId as number;

    try {
      if (editingItem) {
        const updatePayload: UpdateItemRequest = {
          itemCode: formData.itemCode.trim().toUpperCase(),
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          barcode: formData.barcode.trim() || null,
          categoryId: catId,
          isActive: formData.isActive,
        };
        const updated = await itemService.updateItem(editingItem.id, updatePayload);
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
        setSuccessMessage(`Item "${updated.name}" updated successfully.`);
      } else {
        const createPayload: CreateItemRequest = {
          itemCode: formData.itemCode.trim().toUpperCase(),
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          barcode: formData.barcode.trim() || null,
          categoryId: catId,
        };
        const created = await itemService.createItem(createPayload);
        setItems((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        setSuccessMessage(`Item "${created.name}" created successfully.`);
      }
      setIsFormOpen(false);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to save item.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Status
  const handleToggleStatus = async () => {
    if (!toggleConfirmItem) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const updated = await itemService.updateItem(toggleConfirmItem.id, {
        itemCode: toggleConfirmItem.itemCode,
        name: toggleConfirmItem.name,
        description: toggleConfirmItem.description,
        barcode: toggleConfirmItem.barcode,
        categoryId: toggleConfirmItem.categoryId,
        isActive: !toggleConfirmItem.isActive,
      });
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setSuccessMessage(
        `Item "${updated.name}" has been ${updated.isActive ? 'activated' : 'deactivated'}.`
      );
      setToggleConfirmItem(null);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to update item status.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Item
  const handleDelete = async () => {
    if (!deleteConfirmItem) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await itemService.deleteItem(deleteConfirmItem.id);
      setItems((prev) => prev.filter((i) => i.id !== deleteConfirmItem.id));
      setSuccessMessage(`Item "${deleteConfirmItem.name}" deleted successfully.`);
      setDeleteConfirmItem(null);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to delete item.'));
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
          You do not have the required permission (<code>ItemView</code>) to view the Items Catalog.
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
            <Package size={26} className="text-primary" />
            <span>Items Master Catalog</span>
          </h1>
          <p className="page-description">
            Central catalog of inventory goods, SKUs, barcode tracking, and category classifications.
          </p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadData}
            disabled={isLoading}
            title="Refresh catalog items"
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
              <span>Add New Item</span>
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
          {/* Category Filter */}
          <select
            className="filter-select"
            value={selectedCategoryFilter}
            onChange={(e) =>
              setSelectedCategoryFilter(e.target.value === '' ? '' : Number(e.target.value))
            }
            title="Filter by Item Category"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code}) {!c.isActive ? '[Inactive]' : ''}
              </option>
            ))}
          </select>

          {/* Search Input */}
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by SKU code, name, category, barcode..."
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
            <span>Show Inactive Items</span>
          </label>
        </div>

        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Showing <strong>{filteredItems.length}</strong> of <strong>{items.length}</strong> items
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
                <th>Category</th>
                <th>Barcode</th>
                <th>Description</th>
                <th style={{ width: '100px' }}>Status</th>
                <th style={{ width: '120px' }}>Created</th>
                <th style={{ width: '140px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Loading items from catalog...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="table-empty-state">
                      <div className="empty-state-icon">
                        <Package size={28} />
                      </div>
                      <div className="empty-state-title">No Items Found</div>
                      <div className="empty-state-desc">
                        {searchQuery || selectedCategoryFilter !== ''
                          ? 'No items match your active search or category filter.'
                          : 'No items have been registered in the catalog yet.'}
                      </div>
                      {canCreate && !searchQuery && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={handleOpenCreate}
                        >
                          <Plus size={15} />
                          <span>Add First Item</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className={!item.isActive ? 'row-inactive' : ''}>
                    <td>
                      <span className="code-badge">{item.itemCode}</span>
                    </td>
                    <td>
                      <span className="record-name-text">{item.name}</span>
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          color: 'var(--navy-700)',
                        }}
                      >
                        <FolderTree size={13} className="text-muted" />
                        <span>{item.categoryName}</span>
                      </span>
                    </td>
                    <td>
                      {item.barcode ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.8125rem',
                            fontFamily: 'monospace',
                            color: 'var(--navy-800)',
                            backgroundColor: 'var(--gray-100)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          <BarcodeIcon size={12} className="text-muted" />
                          <span>{item.barcode}</span>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>—</span>
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
                          title="View item details"
                        >
                          <Eye size={15} />
                        </button>

                        {canUpdate && (
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit item"
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
                            title={item.isActive ? 'Deactivate item' : 'Activate item'}
                          >
                            {item.isActive ? <XCircle size={15} /> : <CheckCircle size={15} />}
                          </button>
                        )}

                        {canDeactivate && (
                          <button
                            type="button"
                            className="btn-icon text-danger"
                            onClick={() => setDeleteConfirmItem(item)}
                            title="Delete item"
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
        title={editingItem ? `Edit Item: ${editingItem.name}` : 'Add New Item to Catalog'}
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
              {isSubmitting ? 'Saving...' : editingItem ? 'Update Item' : 'Create Item'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label required">Item Code / SKU</label>
            <input
              type="text"
              className={`form-input ${formErrors.itemCode ? 'is-invalid' : ''}`}
              placeholder="e.g., ITM-1001, PRD-0042"
              value={formData.itemCode}
              onChange={(e) => setFormData({ ...formData, itemCode: e.target.value.toUpperCase() })}
              maxLength={50}
            />
            {formErrors.itemCode && (
              <div className="form-feedback-error">{formErrors.itemCode}</div>
            )}
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Unique alphanumeric code. Normalized to uppercase.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label required">Item Name</label>
            <input
              type="text"
              className={`form-input ${formErrors.name ? 'is-invalid' : ''}`}
              placeholder="e.g., A4 Paper Ream, Industrial Hydraulic Oil 20L"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              maxLength={200}
            />
            {formErrors.name && <div className="form-feedback-error">{formErrors.name}</div>}
          </div>

          <div className="form-group">
            <label className="form-label required">Item Category</label>
            <select
              className={`form-select ${formErrors.categoryId ? 'is-invalid' : ''}`}
              value={formData.categoryId}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  categoryId: e.target.value === '' ? '' : Number(e.target.value),
                })
              }
            >
              <option value="">Select Category...</option>
              {categories
                .filter((c) => c.isActive || (editingItem && c.id === editingItem.categoryId))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code}) {!c.isActive ? '[Inactive]' : ''}
                  </option>
                ))}
            </select>
            {formErrors.categoryId && (
              <div className="form-feedback-error">{formErrors.categoryId}</div>
            )}
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Only active categories can be assigned according to backend rules.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Barcode / UPC / EAN</label>
            <div className="search-input-wrapper">
              <BarcodeIcon size={16} className="search-icon" />
              <input
                type="text"
                className={`search-input ${formErrors.barcode ? 'is-invalid' : ''}`}
                placeholder="Optional scan barcode (e.g. 896400012345)"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                maxLength={100}
              />
            </div>
            {formErrors.barcode && (
              <div className="form-feedback-error">{formErrors.barcode}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className={`form-textarea ${formErrors.description ? 'is-invalid' : ''}`}
              rows={3}
              placeholder="Detailed specifications, manufacturer information, storage guidelines..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              maxLength={1000}
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
                <span>Active Status (Item is available for procurement and stock operations)</span>
              </label>
            </div>
          )}
        </form>
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={!!viewingItem}
        onClose={() => setViewingItem(null)}
        title="Item Master Details"
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
              <span className="details-label">Item ID</span>
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
              <span className="details-label">Item Code / SKU</span>
              <span className="details-value">
                <span className="code-badge">{viewingItem.itemCode}</span>
              </span>
            </div>
            <div className="details-item">
              <span className="details-label">Item Name</span>
              <span className="details-value font-medium">{viewingItem.name}</span>
            </div>
            <div className="details-item">
              <span className="details-label">Category</span>
              <span className="details-value font-medium">
                {viewingItem.categoryName} (#{viewingItem.categoryId})
              </span>
            </div>
            <div className="details-item">
              <span className="details-label">Barcode</span>
              <span className="details-value font-mono">
                {viewingItem.barcode || '—'}
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
        title={toggleConfirmItem?.isActive ? 'Deactivate Item' : 'Activate Item'}
        message={`Are you sure you want to ${
          toggleConfirmItem?.isActive ? 'deactivate' : 'activate'
        } item "${toggleConfirmItem?.name}" (${toggleConfirmItem?.itemCode})? ${
          toggleConfirmItem?.isActive
            ? 'Inactive items cannot be used in new purchase requests or inventory operations.'
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
        title="Delete Item"
        message={`Are you sure you want to permanently delete item "${deleteConfirmItem?.name}" (${deleteConfirmItem?.itemCode})? This will remove the catalog item permanently.`}
        confirmLabel="Delete Permanently"
        variant="danger"
        isLoading={isSubmitting}
      />
    </div>
  );
};
