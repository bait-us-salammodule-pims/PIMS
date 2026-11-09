import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Boxes,
  Plus,
  RefreshCw,
  Search,
  Edit2,
  Eye,
  XCircle,
  AlertCircle,
  CheckCircle,
  Lock,
  Warehouse,
  ArrowLeft,
  FolderTree,
} from 'lucide-react';
import { storeService } from '../../api/storeService';
import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  type Store,
  type StoreLocation,
  type CreateStoreLocationRequest,
  type UpdateStoreLocationRequest,
  StoreLocationType,
  StoreLocationTypeLabels,
} from '../../types/store';

export const StoreLocationsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuth();
  const canView = hasPermission('StoreView');
  const canManage = hasPermission('StoreManage');

  // Stores lookup
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | ''>(() => {
    const param = searchParams.get('storeId');
    return param ? Number(param) : '';
  });

  // Locations state
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<number | ''>('');
  const [includeInactive, setIncludeInactive] = useState(false);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StoreLocation | null>(null);
  const [viewingLocation, setViewingLocation] = useState<StoreLocation | null>(null);
  const [deactivatingLocation, setDeactivatingLocation] = useState<StoreLocation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState<{
    type: StoreLocationType;
    name: string;
    code: string;
    parentLocationId?: number;
  }>({
    type: StoreLocationType.Rack,
    name: '',
    code: '',
    parentLocationId: undefined,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Load stores list
  const loadStores = useCallback(async () => {
    try {
      const data = await storeService.getStores(true);
      setStores(data);

      // If no storeId in search params and we have stores, select first active store
      if (!searchParams.get('storeId') && data.length > 0) {
        const firstActive = data.find((s) => s.isActive) || data[0];
        setSelectedStoreId(firstActive.id);
        setSearchParams({ storeId: String(firstActive.id) });
      }
    } catch (err) {
      console.error('Failed to load stores:', err);
    }
  }, [searchParams, setSearchParams]);

  // Load locations for the currently selected store
  const loadLocations = useCallback(async () => {
    if (!canView || !selectedStoreId || selectedStoreId <= 0) {
      setLocations([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await storeService.getLocations(Number(selectedStoreId), includeInactive);
      setLocations(data);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to retrieve storage locations.'));
    } finally {
      setIsLoading(false);
    }
  }, [canView, selectedStoreId, includeInactive]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  // Sync selectedStoreId with searchParams if search param changes
  useEffect(() => {
    const param = searchParams.get('storeId');
    if (param && Number(param) !== selectedStoreId) {
      setSelectedStoreId(Number(param));
    }
  }, [searchParams, selectedStoreId]);

  // Active racks in this store to populate parent dropdown for drawers
  const activeRacks = useMemo(() => {
    return locations.filter(
      (loc) => loc.type === StoreLocationType.Rack && loc.isActive
    );
  }, [locations]);

  // Currently selected store object
  const currentStore = useMemo(() => {
    return stores.find((s) => s.id === selectedStoreId);
  }, [stores, selectedStoreId]);

  // Filtered locations
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      // Type filter
      if (typeFilter !== '' && loc.type !== typeFilter) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          loc.name.toLowerCase().includes(q) ||
          loc.code.toLowerCase().includes(q) ||
          loc.parentLocationName?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [locations, searchQuery, typeFilter]);

  // Store selection change
  const handleStoreChange = (newStoreId: number | '') => {
    setSelectedStoreId(newStoreId);
    if (newStoreId) {
      setSearchParams({ storeId: String(newStoreId) });
    } else {
      setSearchParams({});
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingLocation(null);
    setFormData({
      type: StoreLocationType.Rack,
      name: '',
      code: '',
      parentLocationId: undefined,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (loc: StoreLocation) => {
    setEditingLocation(loc);
    setFormData({
      type: loc.type,
      name: loc.name,
      code: loc.code,
      parentLocationId: loc.parentLocationId || undefined,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Location name is required.';
    } else if (formData.name.trim().length > 200) {
      errors.name = 'Name cannot exceed 200 characters.';
    }

    if (!formData.code.trim()) {
      errors.code = 'Location code is required.';
    } else if (formData.code.trim().length > 50) {
      errors.code = 'Code cannot exceed 50 characters.';
    }

    if (!editingLocation && formData.type === StoreLocationType.Drawer) {
      if (!formData.parentLocationId || formData.parentLocationId <= 0) {
        errors.parentLocationId = 'A drawer must have a parent rack assigned.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !selectedStoreId) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (editingLocation) {
        // PUT accepts UpdateStoreLocationRequest: name and code
        const updatePayload: UpdateStoreLocationRequest = {
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
        };
        await storeService.updateLocation(
          Number(selectedStoreId),
          editingLocation.id,
          updatePayload
        );
        setSuccessMessage(`Location "${updatePayload.name}" updated successfully.`);
      } else {
        // POST accepts CreateStoreLocationRequest
        const createPayload: CreateStoreLocationRequest = {
          type: Number(formData.type) as StoreLocationType,
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          parentLocationId:
            formData.type === StoreLocationType.Drawer && formData.parentLocationId
              ? Number(formData.parentLocationId)
              : null,
        };
        await storeService.createLocation(Number(selectedStoreId), createPayload);
        setSuccessMessage(`Location "${createPayload.name}" created successfully.`);
      }
      setIsFormOpen(false);
      loadLocations();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to save location.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Deactivate Location
  const handleConfirmDeactivate = async () => {
    if (!deactivatingLocation || !selectedStoreId) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await storeService.deactivateLocation(
        Number(selectedStoreId),
        deactivatingLocation.id
      );
      setSuccessMessage(`Location "${deactivatingLocation.name}" deactivated successfully.`);
      setDeactivatingLocation(null);
      loadLocations();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to deactivate location.'));
      setDeactivatingLocation(null);
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
            You do not have the <code>StoreView</code> permission required to view store locations.
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <Link
              to="/stores/list"
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.25rem 0.5rem' }}
              title="Return to Store Directory"
            >
              <ArrowLeft size={14} />
              <span>Stores</span>
            </Link>
          </div>
          <h1 className="page-main-title">
            <Boxes size={26} className="text-primary" />
            <span>Storage Locations (Racks &amp; Drawers)</span>
          </h1>
          <p className="page-subtitle">
            Configure internal rack sections and drawer compartments for precise stock placement.
          </p>
        </div>

        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadLocations}
            disabled={isLoading || !selectedStoreId}
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
              disabled={!selectedStoreId || !currentStore?.isActive}
              title={
                !selectedStoreId
                  ? 'Select a store first'
                  : !currentStore?.isActive
                  ? 'Cannot add locations to an inactive store'
                  : undefined
              }
            >
              <Plus size={16} />
              <span>New Location</span>
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

      {/* Filters & Store Selector */}
      <div className="filter-card">
        <div className="filter-controls-group">
          {/* Target Store Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--navy-700)' }}>
              Selected Store:
            </span>
            <select
              className="filter-select"
              value={selectedStoreId}
              onChange={(e) =>
                handleStoreChange(e.target.value ? Number(e.target.value) : '')
              }
              title="Select Store Facility"
              style={{ fontWeight: 600, minWidth: '220px' }}
            >
              <option value="">-- Choose Store Facility --</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code}) {!s.isActive ? '[Inactive Store]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <select
            className="filter-select"
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value ? Number(e.target.value) : '')
            }
            title="Filter by Location Type"
          >
            <option value="">All Types (Racks &amp; Drawers)</option>
            <option value={StoreLocationType.Rack}>Racks Only</option>
            <option value={StoreLocationType.Drawer}>Drawers Only</option>
          </select>

          {/* Search Input */}
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search code, rack or drawer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={!selectedStoreId}
            />
          </div>

          <label className="filter-checkbox-label">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              disabled={!selectedStoreId}
            />
            <span>Show Inactive Locations</span>
          </label>
        </div>

        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          {selectedStoreId ? (
            <>
              Showing <strong>{filteredLocations.length}</strong> of{' '}
              <strong>{locations.length}</strong> locations
            </>
          ) : (
            'Please select a store facility'
          )}
        </div>
      </div>

      {/* Locations Table */}
      <div className="data-table-container">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '120px' }}>Code</th>
                <th>Location Name</th>
                <th style={{ width: '130px' }}>Type</th>
                <th>Parent Rack</th>
                <th style={{ width: '100px' }}>Status</th>
                <th style={{ width: '120px' }}>Created</th>
                <th style={{ width: '130px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!selectedStoreId ? (
                <tr>
                  <td colSpan={7}>
                    <div className="table-empty-state">
                      <div className="empty-state-icon">
                        <Warehouse size={28} />
                      </div>
                      <div className="empty-state-title">No Store Selected</div>
                      <div className="empty-state-desc">
                        Please choose a store from the dropdown above to view and manage its storage locations.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Loading storage locations...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLocations.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="table-empty-state">
                      <div className="empty-state-icon">
                        <Boxes size={28} />
                      </div>
                      <div className="empty-state-title">No Locations Found</div>
                      <div className="empty-state-desc">
                        {searchQuery || typeFilter
                          ? 'No locations match your search or type filter.'
                          : `No racks or drawers are configured for "${currentStore?.name || 'this store'}".`}
                      </div>
                      {canManage && !searchQuery && currentStore?.isActive && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={handleOpenCreate}
                        >
                          <Plus size={15} />
                          <span>Create First Location</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLocations.map((item) => (
                  <tr key={item.id} className={!item.isActive ? 'row-inactive' : ''}>
                    <td>
                      <span className="code-badge">{item.code}</span>
                    </td>
                    <td>
                      <span className="record-name-text">{item.name}</span>
                    </td>
                    <td>
                      {item.type === StoreLocationType.Rack ? (
                        <span className="badge badge-primary">
                          {StoreLocationTypeLabels[item.type]}
                        </span>
                      ) : (
                        <span className="badge badge-purple">
                          {StoreLocationTypeLabels[item.type]}
                        </span>
                      )}
                    </td>
                    <td>
                      {item.parentLocationName ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--navy-800)' }}>
                          <FolderTree size={12} className="text-muted" />
                          <span>{item.parentLocationName}</span>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-light)' }}>Top-Level Rack</span>
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
                        {/* View Details */}
                        <button
                          type="button"
                          className="btn-icon btn-icon-primary"
                          title="View Location Details"
                          onClick={() => setViewingLocation(item)}
                        >
                          <Eye size={16} />
                        </button>

                        {/* Edit Location */}
                        {canManage && (
                          <>
                            <button
                              type="button"
                              className="btn-icon"
                              title="Edit Location"
                              onClick={() => handleOpenEdit(item)}
                            >
                              <Edit2 size={16} />
                            </button>

                            {/* Deactivate Location (Backend only provides deactivate) */}
                            {item.isActive && (
                              <button
                                type="button"
                                className="btn-icon btn-icon-danger"
                                title="Deactivate Location"
                                onClick={() => setDeactivatingLocation(item)}
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
          <span>
            {currentStore ? `Store: ${currentStore.name} (${currentStore.code})` : 'Store Storage Locations'}
          </span>
          <span>Status filter: {includeInactive ? 'All Records' : 'Active Only'}</span>
        </div>
      </div>

      {/* Create / Edit Location Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => !isSubmitting && setIsFormOpen(false)}
        title={
          editingLocation
            ? `Edit Location: ${editingLocation.name}`
            : `New Storage Location in ${currentStore?.name}`
        }
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
                : editingLocation
                ? 'Save Changes'
                : 'Create Location'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmitForm} noValidate>
          {/* Location Type (Enabled on create, fixed on edit per backend DTO) */}
          <div className="form-group">
            <label className="form-label" htmlFor="type">
              Location Type <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            {editingLocation ? (
              <input
                id="type"
                type="text"
                className="form-input"
                value={StoreLocationTypeLabels[editingLocation.type]}
                disabled
              />
            ) : (
              <select
                id="type"
                className="filter-select"
                style={{ width: '100%', backgroundColor: '#ffffff' }}
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: Number(e.target.value) as StoreLocationType,
                    parentLocationId: undefined, // Clear parent when switching type
                  })
                }
                disabled={isSubmitting}
              >
                <option value={StoreLocationType.Rack}>Rack (Independent Section)</option>
                <option value={StoreLocationType.Drawer}>Drawer (Child of a Rack)</option>
              </select>
            )}
            <div className="form-hint">
              Racks are top-level storage units; Drawers reside inside a parent rack.
            </div>
          </div>

          {/* Parent Rack Selector (Only relevant when Type is Drawer) */}
          {!editingLocation && formData.type === StoreLocationType.Drawer && (
            <div className="form-group">
              <label className="form-label" htmlFor="parentLocationId">
                Parent Rack <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <select
                id="parentLocationId"
                className="filter-select"
                style={{ width: '100%', backgroundColor: '#ffffff' }}
                value={formData.parentLocationId || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    parentLocationId: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                disabled={isSubmitting}
                required
              >
                <option value="">-- Select Parent Rack --</option>
                {activeRacks.map((rack) => (
                  <option key={rack.id} value={rack.id}>
                    {rack.name} ({rack.code})
                  </option>
                ))}
              </select>
              {formErrors.parentLocationId && (
                <div className="form-error">{formErrors.parentLocationId}</div>
              )}
              {activeRacks.length === 0 && (
                <div className="form-error">
                  No active racks exist in this store. You must create a Rack first before creating Drawers.
                </div>
              )}
            </div>
          )}

          {/* Code */}
          <div className="form-group">
            <label className="form-label" htmlFor="code">
              Location Code <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <input
              id="code"
              type="text"
              className="form-input"
              placeholder={formData.type === StoreLocationType.Rack ? 'e.g. RACK-A1, RACK-02' : 'e.g. DRW-01, DRW-A1-02'}
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value.toUpperCase() })
              }
              disabled={isSubmitting}
              maxLength={50}
              required
            />
            {formErrors.code && <div className="form-error">{formErrors.code}</div>}
            <div className="form-hint">Must be unique within this store. Max 50 characters.</div>
          </div>

          {/* Name */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="name">
              Location Name <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <input
              id="name"
              type="text"
              className="form-input"
              placeholder={formData.type === StoreLocationType.Rack ? 'e.g. Main Medicine Rack A, Heavy Tools Shelf' : 'e.g. Top Drawer, Syringes Compartment 1'}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isSubmitting}
              maxLength={200}
              required
            />
            {formErrors.name && <div className="form-error">{formErrors.name}</div>}
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={!!viewingLocation}
        onClose={() => setViewingLocation(null)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Boxes size={20} className="text-primary" />
            <span>Location Profile</span>
          </div>
        }
        footer={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setViewingLocation(null)}
          >
            Close
          </button>
        }
      >
        {viewingLocation && (
          <div className="detail-grid">
            <div className="detail-item">
              <div className="detail-label">Location Code</div>
              <div className="detail-value">
                <span className="code-badge">{viewingLocation.code}</span>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Status</div>
              <div className="detail-value">
                {viewingLocation.isActive ? (
                  <span className="badge badge-success">Active</span>
                ) : (
                  <span className="badge badge-danger">Deactivated</span>
                )}
              </div>
            </div>

            <div className="detail-item full-width">
              <div className="detail-label">Location Name</div>
              <div className="detail-value" style={{ fontWeight: 600 }}>
                {viewingLocation.name}
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Type</div>
              <div className="detail-value">
                {StoreLocationTypeLabels[viewingLocation.type]}
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Parent Rack</div>
              <div className="detail-value">
                {viewingLocation.parentLocationName || 'None (Top-Level Rack)'}
              </div>
            </div>

            <div className="detail-item full-width">
              <div className="detail-label">Store Facility</div>
              <div className="detail-value" style={{ color: 'var(--blue-600)', fontWeight: 600 }}>
                {currentStore?.name} ({currentStore?.code})
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Internal Location ID</div>
              <div className="detail-value">#{viewingLocation.id}</div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Created Date</div>
              <div className="detail-value">
                {new Date(viewingLocation.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Dialog for Deactivate */}
      {deactivatingLocation && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeactivatingLocation(null)}
          onConfirm={handleConfirmDeactivate}
          isLoading={isSubmitting}
          title="Deactivate Storage Location"
          message={
            deactivatingLocation.type === StoreLocationType.Rack
              ? `Are you sure you want to deactivate rack "${deactivatingLocation.name}"? Note: A rack cannot be deactivated while it contains active drawers.`
              : `Are you sure you want to deactivate drawer "${deactivatingLocation.name}"?`
          }
          confirmLabel="Yes, Deactivate"
          variant="danger"
        />
      )}
    </div>
  );
};
