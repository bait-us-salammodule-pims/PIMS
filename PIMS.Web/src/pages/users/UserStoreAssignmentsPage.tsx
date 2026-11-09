import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Warehouse,
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle,
  Lock,
  Star,
  Trash2,
  User as UserIcon,
  Store as StoreIcon,
} from 'lucide-react';
import { usersAccessService } from '../../api/usersAccessService';
import { storeService } from '../../api/storeService';
import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import type {
  UserResponse,
  UserStoreAssignmentResponse,
  AssignUserStoreRequest,
} from '../../types/usersAccess';
import type { Store } from '../../types/store';

export const UserStoreAssignmentsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuth();

  const canViewStores = hasPermission('StoreView');
  const canManageStores = hasPermission('StoreManage');
  const canViewUsers = hasPermission('UserView');

  // Initial user from URL if provided
  const initialUserIdParam = searchParams.get('userId');

  // Core Data
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | ''>(
    initialUserIdParam ? Number(initialUserIdParam) : ''
  );
  const [assignments, setAssignments] = useState<UserStoreAssignmentResponse[]>([]);

  // Loading & Alert States
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // User search/filter
  const [userSearch, setUserSearch] = useState('');

  // Assign Store Modal
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState<AssignUserStoreRequest>({
    storeId: 0,
    isDefault: false,
  });
  const [assignErrors, setAssignErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Remove confirmation
  const [confirmRemove, setConfirmRemove] = useState<UserStoreAssignmentResponse | null>(null);

  // Initial Load (Users and Active Stores)
  useEffect(() => {
    let ignore = false;
    const fetchInitial = async () => {
      try {
        const [usersData, storesData] = await Promise.all([
          canViewUsers ? usersAccessService.getUsers() : Promise.resolve([] as UserResponse[]),
          canViewStores ? storeService.getStores(false) : Promise.resolve([] as Store[]),
        ]);
        if (ignore) return;
        setUsers(usersData);
        setStores(storesData);
        if (initialUserIdParam) {
          setSelectedUserId(Number(initialUserIdParam));
        } else if (usersData.length > 0) {
          setSelectedUserId(usersData[0].id);
        }
      } catch (err) {
        if (!ignore) {
          setErrorMessage(extractErrorMessage(err, 'Failed to load user or store directory.'));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void fetchInitial();
    return () => {
      ignore = true;
    };
  }, [canViewStores, canViewUsers, initialUserIdParam]);

  // Load Assignments for Selected User
  useEffect(() => {
    if (!selectedUserId || typeof selectedUserId !== 'number' || !canViewStores) {
      return;
    }
    let ignore = false;
    const fetchAssignments = async () => {
      try {
        const data = await usersAccessService.getUserStores(selectedUserId);
        if (ignore) return;
        setAssignments(data);
      } catch (err) {
        if (!ignore) {
          setErrorMessage(extractErrorMessage(err, 'Failed to retrieve store assignments for this user.'));
        }
      } finally {
        if (!ignore) {
          setIsLoadingAssignments(false);
        }
      }
    };

    void fetchAssignments();
    return () => {
      ignore = true;
    };
  }, [selectedUserId, canViewStores]);

  // Fetch / Refresh Assignments (used by mutations and refresh button)
  const refreshAssignments = async (userId: number) => {
    setIsLoadingAssignments(true);
    setErrorMessage(null);
    try {
      const data = await usersAccessService.getUserStores(userId);
      setAssignments(data);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to retrieve store assignments for this user.'));
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  const refreshAll = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [usersData, storesData] = await Promise.all([
        canViewUsers ? usersAccessService.getUsers() : Promise.resolve([] as UserResponse[]),
        canViewStores ? storeService.getStores(false) : Promise.resolve([] as Store[]),
      ]);
      setUsers(usersData);
      setStores(storesData);
      if (selectedUserId && typeof selectedUserId === 'number') {
        const data = await usersAccessService.getUserStores(selectedUserId);
        setAssignments(data);
      }
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to refresh data.'));
    } finally {
      setIsLoading(false);
    }
  };

  // Selected User Object
  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    return users.find((u) => u.id === Number(selectedUserId)) || null;
  }, [users, selectedUserId]);

  // Filtered Users for dropdown/search
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase().trim();
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  // Stores available to assign (not already assigned to this user)
  const availableStores = useMemo(() => {
    const assignedIds = new Set(assignments.map((a) => a.storeId));
    return stores.filter((s) => !assignedIds.has(s.id) && s.isActive);
  }, [stores, assignments]);

  // Handle User Change
  const handleUserChange = (userId: number | '') => {
    setSelectedUserId(userId);
    if (userId) {
      setSearchParams({ userId: String(userId) });
    } else {
      setSearchParams({});
    }
  };

  // Open Assign Store Modal
  const handleOpenAssign = () => {
    setAssignForm({
      storeId: availableStores.length > 0 ? availableStores[0].id : 0,
      isDefault: assignments.length === 0, // Auto-check if first assignment
    });
    setAssignErrors({});
    setIsAssignOpen(true);
  };

  // Submit Assign Store
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || typeof selectedUserId !== 'number') return;

    if (!assignForm.storeId || assignForm.storeId <= 0) {
      setAssignErrors({ storeId: 'Please select a valid store to assign.' });
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await usersAccessService.assignUserStore(selectedUserId, {
        storeId: Number(assignForm.storeId),
        isDefault: assignForm.isDefault,
      });

      setSuccessMessage(`Store "${res.storeName}" assigned successfully.`);
      setIsAssignOpen(false);
      await refreshAssignments(selectedUserId);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to assign store to user.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set Default Store
  const handleSetDefault = async (storeId: number) => {
    if (!selectedUserId || typeof selectedUserId !== 'number' || !canManageStores) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await usersAccessService.setDefaultUserStore(selectedUserId, storeId);
      setSuccessMessage('Default store updated successfully.');
      await refreshAssignments(selectedUserId);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to set default store.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Remove Assignment
  const handleConfirmRemove = async () => {
    if (!confirmRemove || !selectedUserId || typeof selectedUserId !== 'number') return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await usersAccessService.removeUserStore(selectedUserId, confirmRemove.storeId);
      setSuccessMessage(`Assignment for "${confirmRemove.storeName}" removed.`);
      setConfirmRemove(null);
      await refreshAssignments(selectedUserId);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to remove store assignment.'));
      setConfirmRemove(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canViewStores && !canViewUsers) {
    return (
      <div className="unauthorized-container">
        <div className="unauthorized-card">
          <div className="unauthorized-icon-wrap">
            <Lock size={40} className="text-danger" />
          </div>
          <h2>Access Restricted</h2>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
            You do not have the <code>StoreView</code> permission required to view user store assignments.
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
            <span>User Store Access Control</span>
          </h1>
          <p className="page-subtitle">
            Authorize users to access specific warehouse and departmental store locations.
          </p>
        </div>

        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={refreshAll}
            disabled={isLoading}
            title="Refresh assignments"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {canManageStores && selectedUserId && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleOpenAssign}
              disabled={availableStores.length === 0}
              title={
                availableStores.length === 0
                  ? 'All active stores have already been assigned to this user'
                  : 'Assign store'
              }
            >
              <Plus size={16} />
              <span>Assign Store</span>
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

      {/* User Selection & Search Bar */}
      <div className="filter-card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
          <label style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--navy-900)', whiteSpace: 'nowrap' }}>
            Select User:
          </label>
          <select
            className="filter-select"
            value={selectedUserId}
            onChange={(e) =>
              handleUserChange(e.target.value ? Number(e.target.value) : '')
            }
            style={{ maxWidth: '360px' }}
          >
            <option value="">-- Choose User Account --</option>
            {filteredUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} (@{u.username})
              </option>
            ))}
          </select>
        </div>

        {/* Quick search to find users */}
        <div className="search-input-wrapper" style={{ minWidth: '240px' }}>
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search users..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Selected User Summary Banner */}
      {selectedUser && (
        <div
          style={{
            backgroundColor: 'var(--navy-50, #f8fafc)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-100, #dbeafe)',
                color: 'var(--primary-700, #1d4ed8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserIcon size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--navy-900)' }}>
                {selectedUser.fullName}{' '}
                <span className="font-mono text-muted" style={{ fontSize: '0.8125rem' }}>
                  (@{selectedUser.username})
                </span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {selectedUser.email} &bull; Account Status:{' '}
                {selectedUser.isActive ? (
                  <span className="text-success" style={{ fontWeight: 600 }}>Active</span>
                ) : (
                  <span className="text-danger" style={{ fontWeight: 600 }}>Inactive</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Authorized Stores</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--navy-900)' }}>
              {assignments.length}
            </div>
          </div>
        </div>
      )}

      {/* Assigned Stores Table */}
      <div className="table-card">
        {selectedUser ? (
          <>
            <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>
                Authorized Stores for {selectedUser.fullName}
              </h3>
              {isLoadingAssignments && (
                <RefreshCw size={16} className="animate-spin text-muted" />
              )}
            </div>

            {assignments.length === 0 ? (
              <div className="empty-state-container" style={{ padding: '3rem 0' }}>
                <Warehouse size={48} className="text-muted" />
                <h3 style={{ marginTop: '1rem' }}>No stores assigned</h3>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  This user currently has no explicit store authorizations.
                </p>
                {canManageStores && availableStores.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleOpenAssign}
                    style={{ marginTop: '1rem' }}
                  >
                    <Plus size={16} />
                    <span>Assign First Store</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Store ID</th>
                      <th>Store Name</th>
                      <th>Store Code</th>
                      <th style={{ width: '160px' }}>Default Status</th>
                      {canManageStores && <th style={{ width: '180px', textAlign: 'right' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((assignment) => (
                      <tr key={assignment.storeId}>
                        <td className="text-muted font-mono">{assignment.storeId}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <StoreIcon size={16} className="text-primary" />
                            <span style={{ fontWeight: 600, color: 'var(--navy-900)' }}>
                              {assignment.storeName}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="font-mono text-muted" style={{ fontSize: '0.8125rem' }}>
                            {assignment.storeCode}
                          </span>
                        </td>
                        <td>
                          {assignment.isDefault ? (
                            <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Star size={12} fill="currentColor" />
                              <span>Default Store</span>
                            </span>
                          ) : (
                            <span className="text-muted" style={{ fontSize: '0.8125rem' }}>
                              Authorized
                            </span>
                          )}
                        </td>
                        {canManageStores && (
                          <td>
                            <div className="action-buttons-cell" style={{ justifyContent: 'flex-end' }}>
                              {!assignment.isDefault && (
                                <button
                                  type="button"
                                  className="btn btn-outline-primary btn-sm"
                                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                  onClick={() => handleSetDefault(assignment.storeId)}
                                  disabled={isSubmitting}
                                  title="Designate as primary default store for this user"
                                >
                                  <Star size={12} />
                                  <span>Make Default</span>
                                </button>
                              )}

                              <button
                                type="button"
                                className="btn-icon text-danger"
                                title="Remove Store Access"
                                onClick={() => setConfirmRemove(assignment)}
                                disabled={isSubmitting}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state-container" style={{ padding: '3rem 0' }}>
            <UserIcon size={48} className="text-muted" />
            <h3 style={{ marginTop: '1rem' }}>No user selected</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Please select a user account above to view and manage their authorized stores.
            </p>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* ASSIGN STORE MODAL */}
      {/* ============================================================ */}
      <Modal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Warehouse size={20} className="text-primary" />
            <span>Assign Store to {selectedUser?.fullName}</span>
          </div>
        }
        size="md"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsAssignOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="assign-store-form"
              className="btn btn-primary"
              disabled={isSubmitting || availableStores.length === 0}
            >
              {isSubmitting ? 'Assigning...' : 'Assign Store'}
            </button>
          </>
        }
      >
        <form id="assign-store-form" onSubmit={handleAssignSubmit} noValidate>
          <div className="form-group">
            <label className="form-label required">Select Store Location</label>
            <select
              className={`form-select ${assignErrors.storeId ? 'is-invalid' : ''}`}
              value={assignForm.storeId}
              onChange={(e) =>
                setAssignForm({ ...assignForm, storeId: Number(e.target.value) })
              }
              required
            >
              <option value={0}>-- Choose Store --</option>
              {availableStores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
            {assignErrors.storeId && (
              <div className="invalid-feedback">{assignErrors.storeId}</div>
            )}
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={assignForm.isDefault}
                onChange={(e) =>
                  setAssignForm({ ...assignForm, isDefault: e.target.checked })
                }
              />
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                Set as user&apos;s default store
              </span>
            </label>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 1.5rem' }}>
              When set, transactions initiated by this user will automatically pre-select this store location.
            </p>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* CONFIRM REMOVE ASSIGNMENT DIALOG */}
      {/* ============================================================ */}
      <ConfirmDialog
        isOpen={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={handleConfirmRemove}
        title="Remove Store Assignment"
        message={
          confirmRemove?.isDefault
            ? `"${confirmRemove.storeName}" is currently the default store for this user. If removed, the system will automatically promote another store as default.`
            : `Are you sure you want to revoke store access to "${confirmRemove?.storeName}" for ${selectedUser?.fullName}?`
        }
        confirmLabel="Remove Access"
        variant="danger"
        isLoading={isSubmitting}
      />
    </div>
  );
};
