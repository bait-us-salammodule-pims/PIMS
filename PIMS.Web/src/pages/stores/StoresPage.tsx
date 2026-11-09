import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Warehouse,
  Plus,
  RefreshCw,
  Search,
  Edit2,
  Eye,
  XCircle,
  AlertCircle,
  CheckCircle,
  MapPin,
  Phone,
  Lock,
  GitBranch,
  Layers,
  Boxes,
} from 'lucide-react';
import { storeService } from '../../api/storeService';
import { organizationService } from '../../api/organizationService';
import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  type Store,
  type CreateStoreRequest,
  type UpdateStoreRequest,
  StoreType,
  StoreTypeLabels,
  PosType,
  PosTypeLabels,
  ReceiptFormat,
  ReceiptFormatLabels,
} from '../../types/store';
import type { Branch, Department } from '../../types/organization';

export const StoresPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canView = hasPermission('StoreView');
  const canManage = hasPermission('StoreManage');

  // State
  const [stores, setStores] = useState<Store[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<number | ''>('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<number | ''>('');
  const [includeInactive, setIncludeInactive] = useState(false);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [viewingStore, setViewingStore] = useState<Store | null>(null);
  const [deactivatingStore, setDeactivatingStore] = useState<Store | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState<CreateStoreRequest>({
    name: '',
    code: '',
    imageUrl: '',
    storeType: StoreType.MainStore,
    receiptFormat: ReceiptFormat.A4,
    posType: PosType.None,
    buildingLocation: '',
    roomLocation: '',
    email: '',
    cellNo: '',
    description: '',
    branchId: undefined,
    departmentId: undefined,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Lookup maps for display
  const branchMap = useMemo(() => {
    const map = new Map<number, string>();
    branches.forEach((b) => map.set(b.id, b.name));
    return map;
  }, [branches]);

  const departmentMap = useMemo(() => {
    const map = new Map<number, string>();
    departments.forEach((d) => map.set(d.id, d.name));
    return map;
  }, [departments]);

  // Load Organization lookup data
  const loadOrganizationLookups = useCallback(async () => {
    try {
      const [brData, deptData] = await Promise.all([
        organizationService.getBranches(undefined, true),
        organizationService.getDepartments(undefined, true),
      ]);
      setBranches(brData);
      setDepartments(deptData);
    } catch (err) {
      console.error('Failed to load organization dropdowns for stores:', err);
    }
  }, []);

  // Load Stores
  const loadStores = useCallback(async () => {
    if (!canView) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await storeService.getStores(includeInactive);
      setStores(data);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to retrieve stores.'));
    } finally {
      setIsLoading(false);
    }
  }, [canView, includeInactive]);

  useEffect(() => {
    loadOrganizationLookups();
  }, [loadOrganizationLookups]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  // Filtered Stores for Table
  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      // Type filter
      if (selectedTypeFilter !== '' && store.storeType !== selectedTypeFilter) {
        return false;
      }
      // Branch filter
      if (selectedBranchFilter !== '' && store.branchId !== selectedBranchFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const branchName = store.branchId ? branchMap.get(store.branchId) || '' : '';
        const deptName = store.departmentId ? departmentMap.get(store.departmentId) || '' : '';

        const matches =
          store.name.toLowerCase().includes(q) ||
          store.code.toLowerCase().includes(q) ||
          store.email?.toLowerCase().includes(q) ||
          store.cellNo?.toLowerCase().includes(q) ||
          store.buildingLocation?.toLowerCase().includes(q) ||
          store.roomLocation?.toLowerCase().includes(q) ||
          store.description?.toLowerCase().includes(q) ||
          branchName.toLowerCase().includes(q) ||
          deptName.toLowerCase().includes(q);

        if (!matches) return false;
      }
      return true;
    });
  }, [stores, searchQuery, selectedTypeFilter, selectedBranchFilter, branchMap, departmentMap]);

  // Department dropdown options inside modal based on selected Branch
  const formDepartmentOptions = useMemo(() => {
    if (!formData.branchId) {
      return departments.filter((d) => d.isActive);
    }
    return departments.filter(
      (d) => d.branchId === formData.branchId && (d.isActive || d.id === formData.departmentId)
    );
  }, [departments, formData.branchId, formData.departmentId]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingStore(null);
    setFormData({
      name: '',
      code: '',
      imageUrl: '',
      storeType: StoreType.MainStore,
      receiptFormat: ReceiptFormat.A4,
      posType: PosType.None,
      buildingLocation: '',
      roomLocation: '',
      email: '',
      cellNo: '',
      description: '',
      branchId: branches.length > 0 ? branches[0].id : undefined,
      departmentId: undefined,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (store: Store) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      code: store.code,
      imageUrl: store.imageUrl || '',
      storeType: store.storeType,
      receiptFormat: store.receiptFormat,
      posType: store.posType,
      buildingLocation: store.buildingLocation || '',
      roomLocation: store.roomLocation || '',
      email: store.email || '',
      cellNo: store.cellNo || '',
      description: store.description || '',
      branchId: store.branchId || undefined,
      departmentId: store.departmentId || undefined,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  // Form Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Store name is required.';
    } else if (formData.name.trim().length > 200) {
      errors.name = 'Name cannot exceed 200 characters.';
    }

    if (!formData.code.trim()) {
      errors.code = 'Store code is required.';
    } else if (formData.code.trim().length > 50) {
      errors.code = 'Code cannot exceed 50 characters.';
    }

    if (formData.email?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'Invalid email address format.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const payload: CreateStoreRequest | UpdateStoreRequest = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        imageUrl: formData.imageUrl?.trim() || null,
        storeType: Number(formData.storeType) as StoreType,
        receiptFormat: Number(formData.receiptFormat) as ReceiptFormat,
        posType: Number(formData.posType) as PosType,
        buildingLocation: formData.buildingLocation?.trim() || null,
        roomLocation: formData.roomLocation?.trim() || null,
        email: formData.email?.trim() || null,
        cellNo: formData.cellNo?.trim() || null,
        description: formData.description?.trim() || null,
        branchId: formData.branchId ? Number(formData.branchId) : null,
        departmentId: formData.departmentId ? Number(formData.departmentId) : null,
      };

      if (editingStore) {
        await storeService.updateStore(editingStore.id, payload);
        setSuccessMessage(`Store "${payload.name}" updated successfully.`);
      } else {
        await storeService.createStore(payload);
        setSuccessMessage(`Store "${payload.name}" created successfully.`);
      }
      setIsFormOpen(false);
      loadStores();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to save store.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Deactivate Store
  const handleConfirmDeactivate = async () => {
    if (!deactivatingStore) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await storeService.deactivateStore(deactivatingStore.id);
      setSuccessMessage(`Store "${deactivatingStore.name}" deactivated successfully.`);
      setDeactivatingStore(null);
      loadStores();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to deactivate store.'));
      setDeactivatingStore(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStoreTypeBadge = (type: StoreType) => {
    switch (type) {
      case StoreType.MainStore:
        return <span className="badge badge-primary">{StoreTypeLabels[type]}</span>;
      case StoreType.SubStore:
        return <span className="badge badge-purple">{StoreTypeLabels[type]}</span>;
      case StoreType.DepartmentStore:
        return <span className="badge badge-cyan">{StoreTypeLabels[type]}</span>;
      case StoreType.Pharmacy:
        return <span className="badge badge-success">{StoreTypeLabels[type]}</span>;
      case StoreType.LabStore:
        return <span className="badge badge-warning">{StoreTypeLabels[type]}</span>;
      default:
        return <span className="badge badge-secondary">{StoreTypeLabels[type] || 'Other'}</span>;
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
            You do not have the <code>StoreView</code> permission required to view stores.
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
            <Warehouse size={26} className="text-primary" />
            <span>Store Directory</span>
          </h1>
          <p className="page-subtitle">
            Manage central warehouses, regional store rooms, POS registries, and pharmacy stores.
          </p>
        </div>

        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadStores}
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
              <span>New Store</span>
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

      {/* Filters & Search Bar */}
      <div className="filter-card">
        <div className="filter-controls-group">
          {/* Store Type Filter */}
          <select
            className="filter-select"
            value={selectedTypeFilter}
            onChange={(e) =>
              setSelectedTypeFilter(e.target.value ? Number(e.target.value) : '')
            }
            title="Filter by Store Type"
          >
            <option value="">All Store Types</option>
            {Object.entries(StoreTypeLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          {/* Branch Filter */}
          <select
            className="filter-select"
            value={selectedBranchFilter}
            onChange={(e) =>
              setSelectedBranchFilter(e.target.value ? Number(e.target.value) : '')
            }
            title="Filter by Branch"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Search Input */}
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search store name, code, location..."
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
            <span>Show Inactive Stores</span>
          </label>
        </div>

        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Showing <strong>{filteredStores.length}</strong> of{' '}
          <strong>{stores.length}</strong> stores
        </div>
      </div>

      {/* Stores Data Table */}
      <div className="data-table-container">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '110px' }}>Code</th>
                <th>Store Name</th>
                <th>Type</th>
                <th>Organization Scope</th>
                <th>Physical Location</th>
                <th>POS / Receipt</th>
                <th style={{ width: '90px' }}>Status</th>
                <th style={{ width: '150px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Loading stores from server...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredStores.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="table-empty-state">
                      <div className="empty-state-icon">
                        <Warehouse size={28} />
                      </div>
                      <div className="empty-state-title">No Stores Found</div>
                      <div className="empty-state-desc">
                        {searchQuery || selectedTypeFilter || selectedBranchFilter
                          ? 'No stores match your selected filters.'
                          : 'No stores are currently registered in the database.'}
                      </div>
                      {canManage && !searchQuery && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={handleOpenCreate}
                        >
                          <Plus size={15} />
                          <span>Create First Store</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStores.map((item) => (
                  <tr key={item.id} className={!item.isActive ? 'row-inactive' : ''}>
                    <td>
                      <span className="code-badge">{item.code}</span>
                    </td>
                    <td>
                      <span className="record-name-text">{item.name}</span>
                      {item.cellNo && (
                        <span className="record-subtext" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Phone size={11} /> {item.cellNo}
                        </span>
                      )}
                    </td>
                    <td>{getStoreTypeBadge(item.storeType)}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.8125rem' }}>
                        {item.branchId ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--navy-800)' }}>
                            <GitBranch size={12} className="text-muted" />
                            <span>{branchMap.get(item.branchId) || `Branch #${item.branchId}`}</span>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-light)' }}>Global / Enterprise</span>
                        )}
                        {item.departmentId && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)' }}>
                            <Layers size={11} />
                            <span>{departmentMap.get(item.departmentId) || `Dept #${item.departmentId}`}</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--navy-800)' }}>
                        {item.buildingLocation || item.roomLocation ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <MapPin size={12} className="text-muted" />
                            <span>
                              {[item.buildingLocation, item.roomLocation]
                                .filter(Boolean)
                                .join(' - ')}
                            </span>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-light)' }}>—</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--navy-800)' }}>
                          {PosTypeLabels[item.posType] || 'None'}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {ReceiptFormatLabels[item.receiptFormat] || 'A4'}
                        </span>
                      </div>
                    </td>
                    <td>
                      {item.isActive ? (
                        <span className="badge badge-success">Active</span>
                      ) : (
                        <span className="badge badge-danger">Inactive</span>
                      )}
                    </td>
                    <td>
                      <div className="action-cell" style={{ justifyContent: 'flex-end' }}>
                        {/* Manage Locations */}
                        <button
                          type="button"
                          className="btn-icon btn-icon-primary"
                          title="Manage Rack & Drawer Locations"
                          onClick={() => navigate(`/stores/locations?storeId=${item.id}`)}
                        >
                          <Boxes size={16} />
                        </button>

                        {/* View Details */}
                        <button
                          type="button"
                          className="btn-icon"
                          title="View Store Details"
                          onClick={() => setViewingStore(item)}
                        >
                          <Eye size={16} />
                        </button>

                        {/* Edit Store */}
                        {canManage && (
                          <>
                            <button
                              type="button"
                              className="btn-icon"
                              title="Edit Store"
                              onClick={() => handleOpenEdit(item)}
                            >
                              <Edit2 size={16} />
                            </button>

                            {/* Deactivate Store (Backend only exposes deactivate) */}
                            {item.isActive && (
                              <button
                                type="button"
                                className="btn-icon btn-icon-danger"
                                title="Deactivate Store"
                                onClick={() => setDeactivatingStore(item)}
                              >
                                <XCircle size={16} />
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
          <span>Enterprise Stores &amp; Warehouses</span>
          <span>Status filter: {includeInactive ? 'All Records' : 'Active Only'}</span>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => !isSubmitting && setIsFormOpen(false)}
        size="lg"
        title={editingStore ? `Edit Store: ${editingStore.name}` : 'New Store Facility'}
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
                : editingStore
                ? 'Save Changes'
                : 'Create Store'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmitForm} noValidate>
          {/* Row 1: Code & Name */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="code">
                Store Code <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <input
                id="code"
                type="text"
                className="form-input"
                placeholder="e.g. WH-01, PHARM-01"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
                disabled={isSubmitting}
                maxLength={50}
                required
              />
              {formErrors.code && <div className="form-error">{formErrors.code}</div>}
              <div className="form-hint">Unique facility code.</div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="name">
                Store Name <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <input
                id="name"
                type="text"
                className="form-input"
                placeholder="e.g. Central Warehouse Karachi, Hospital Pharmacy"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isSubmitting}
                maxLength={200}
                required
              />
              {formErrors.name && <div className="form-error">{formErrors.name}</div>}
            </div>
          </div>

          {/* Row 2: Store Type, POS Type, Receipt Format */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="storeType">
                Store Type <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <select
                id="storeType"
                className="filter-select"
                style={{ width: '100%', backgroundColor: '#ffffff' }}
                value={formData.storeType}
                onChange={(e) =>
                  setFormData({ ...formData, storeType: Number(e.target.value) as StoreType })
                }
                disabled={isSubmitting}
              >
                {Object.entries(StoreTypeLabels).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="posType">
                POS Type
              </label>
              <select
                id="posType"
                className="filter-select"
                style={{ width: '100%', backgroundColor: '#ffffff' }}
                value={formData.posType}
                onChange={(e) =>
                  setFormData({ ...formData, posType: Number(e.target.value) as PosType })
                }
                disabled={isSubmitting}
              >
                {Object.entries(PosTypeLabels).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="receiptFormat">
                Receipt Format
              </label>
              <select
                id="receiptFormat"
                className="filter-select"
                style={{ width: '100%', backgroundColor: '#ffffff' }}
                value={formData.receiptFormat}
                onChange={(e) =>
                  setFormData({ ...formData, receiptFormat: Number(e.target.value) as ReceiptFormat })
                }
                disabled={isSubmitting}
              >
                {Object.entries(ReceiptFormatLabels).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Organization Scope (Branch & Department) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="branchId">
                Branch Scope
              </label>
              <select
                id="branchId"
                className="filter-select"
                style={{ width: '100%', backgroundColor: '#ffffff' }}
                value={formData.branchId || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    branchId: e.target.value ? Number(e.target.value) : undefined,
                    departmentId: undefined, // Reset department when branch changes
                  })
                }
                disabled={isSubmitting}
              >
                <option value="">-- No Specific Branch (Global) --</option>
                {branches
                  .filter((b) => b.isActive || b.id === formData.branchId)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
              </select>
              <div className="form-hint">Physical branch where store is located.</div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="departmentId">
                Department Scope
              </label>
              <select
                id="departmentId"
                className="filter-select"
                style={{ width: '100%', backgroundColor: '#ffffff' }}
                value={formData.departmentId || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    departmentId: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                disabled={isSubmitting}
              >
                <option value="">-- No Specific Department --</option>
                {formDepartmentOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
              <div className="form-hint">Assigned operating department.</div>
            </div>
          </div>

          {/* Row 4: Building & Room Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="buildingLocation">
                Building Location
              </label>
              <input
                id="buildingLocation"
                type="text"
                className="form-input"
                placeholder="e.g. Block A, Warehouse Shed 2"
                value={formData.buildingLocation || ''}
                onChange={(e) =>
                  setFormData({ ...formData, buildingLocation: e.target.value })
                }
                disabled={isSubmitting}
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="roomLocation">
                Room / Area Location
              </label>
              <input
                id="roomLocation"
                type="text"
                className="form-input"
                placeholder="e.g. Room 102, Ground Floor"
                value={formData.roomLocation || ''}
                onChange={(e) =>
                  setFormData({ ...formData, roomLocation: e.target.value })
                }
                disabled={isSubmitting}
                maxLength={100}
              />
            </div>
          </div>

          {/* Row 5: Email & Phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Store Contact Email
              </label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="store.khi@baitussalam.org"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isSubmitting}
                maxLength={150}
              />
              {formErrors.email && <div className="form-error">{formErrors.email}</div>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="cellNo">
                Phone / Cell Number
              </label>
              <input
                id="cellNo"
                type="text"
                className="form-input"
                placeholder="+92 300 1234567"
                value={formData.cellNo || ''}
                onChange={(e) => setFormData({ ...formData, cellNo: e.target.value })}
                disabled={isSubmitting}
                maxLength={50}
              />
            </div>
          </div>

          {/* Row 6: Description */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="description">
              Description / Notes
            </label>
            <textarea
              id="description"
              className="form-input"
              rows={3}
              placeholder="Operational details, storage temperature requirements, authorized access notes..."
              value={formData.description || ''}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              disabled={isSubmitting}
              maxLength={500}
            />
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={!!viewingStore}
        onClose={() => setViewingStore(null)}
        size="lg"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Warehouse size={20} className="text-primary" />
            <span>Store Facility Profile</span>
          </div>
        }
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            {viewingStore && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const id = viewingStore.id;
                  setViewingStore(null);
                  navigate(`/stores/locations?storeId=${id}`);
                }}
              >
                <Boxes size={15} />
                <span>Manage Rack / Drawer Locations</span>
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setViewingStore(null)}
              style={{ marginLeft: 'auto' }}
            >
              Close
            </button>
          </div>
        }
      >
        {viewingStore && (
          <div className="detail-grid">
            <div className="detail-item">
              <div className="detail-label">Store Code</div>
              <div className="detail-value">
                <span className="code-badge">{viewingStore.code}</span>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Store Status</div>
              <div className="detail-value">
                {viewingStore.isActive ? (
                  <span className="badge badge-success">Active Facility</span>
                ) : (
                  <span className="badge badge-danger">Deactivated</span>
                )}
              </div>
            </div>

            <div className="detail-item full-width">
              <div className="detail-label">Store Name</div>
              <div className="detail-value" style={{ fontWeight: 600, fontSize: '1.05rem' }}>
                {viewingStore.name}
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Facility Type</div>
              <div className="detail-value">{getStoreTypeBadge(viewingStore.storeType)}</div>
            </div>

            <div className="detail-item">
              <div className="detail-label">POS Configuration</div>
              <div className="detail-value">
                {PosTypeLabels[viewingStore.posType]} ({ReceiptFormatLabels[viewingStore.receiptFormat]})
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Assigned Branch</div>
              <div className="detail-value" style={{ color: 'var(--blue-600)', fontWeight: 600 }}>
                {viewingStore.branchId
                  ? branchMap.get(viewingStore.branchId) || `Branch #${viewingStore.branchId}`
                  : 'Enterprise Global (All Branches)'}
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Assigned Department</div>
              <div className="detail-value">
                {viewingStore.departmentId
                  ? departmentMap.get(viewingStore.departmentId) || `Dept #${viewingStore.departmentId}`
                  : 'All Departments'}
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Building / Area</div>
              <div className="detail-value">{viewingStore.buildingLocation || '—'}</div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Room / Floor</div>
              <div className="detail-value">{viewingStore.roomLocation || '—'}</div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Contact Email</div>
              <div className="detail-value">{viewingStore.email || '—'}</div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Contact Phone</div>
              <div className="detail-value">{viewingStore.cellNo || '—'}</div>
            </div>

            {viewingStore.description && (
              <div className="detail-item full-width">
                <div className="detail-label">Description / Instructions</div>
                <div className="detail-value">{viewingStore.description}</div>
              </div>
            )}

            <div className="detail-item">
              <div className="detail-label">Internal Store ID</div>
              <div className="detail-value">#{viewingStore.id}</div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Created Date</div>
              <div className="detail-value">
                {new Date(viewingStore.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Dialog for Deactivate */}
      {deactivatingStore && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeactivatingStore(null)}
          onConfirm={handleConfirmDeactivate}
          isLoading={isSubmitting}
          title="Deactivate Store Facility"
          message={`Are you sure you want to deactivate store "${deactivatingStore.name}" (${deactivatingStore.code})? Note: Stores cannot be deactivated while active rack/drawer locations exist.`}
          confirmLabel="Yes, Deactivate Store"
          variant="danger"
        />
      )}
    </div>
  );
};
