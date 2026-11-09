import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  RefreshCw,
  Search,
  Edit2,
  Eye,
  CheckCircle,
  AlertCircle,
  Lock,
  Shield,
  Warehouse,
  UserCheck,
  UserX,
} from 'lucide-react';
import { usersAccessService } from '../../api/usersAccessService';
import { organizationService } from '../../api/organizationService';
import { storeService } from '../../api/storeService';
import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import type {
  UserResponse,
  CreateUserRequest,
  UpdateUserRequest,
  RoleResponse,
} from '../../types/usersAccess';
import type { Branch, Department } from '../../types/organization';
import type { Store } from '../../types/store';

export const UsersListPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const canView = hasPermission('UserView');
  const canCreate = hasPermission('UserCreate');
  const canUpdate = hasPermission('UserUpdate');
  const canDeactivate = hasPermission('UserDeactivate');
  const canAssignRole = hasPermission('RoleUpdate');
  const canViewStores = hasPermission('StoreView');

  // Main list state
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stores, setStores] = useState<Store[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [viewingUser, setViewingUser] = useState<UserResponse | null>(null);
  const [roleAssignUser, setRoleAssignUser] = useState<UserResponse | null>(null);
  const [selectedRoleIdToAssign, setSelectedRoleIdToAssign] = useState<number | ''>('');
  const [confirmStatusUser, setConfirmStatusUser] = useState<{
    user: UserResponse;
    action: 'activate' | 'deactivate';
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create Form State
  const [createForm, setCreateForm] = useState<CreateUserRequest & { initialRoleId?: number | '' }>({
    fullName: '',
    username: '',
    email: '',
    password: '',
    branchId: null,
    departmentId: null,
    storeId: null,
    initialRoleId: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  // Edit Form State
  const [editForm, setEditForm] = useState<UpdateUserRequest>({
    fullName: '',
    email: '',
    branchId: null,
    departmentId: null,
    storeId: null,
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // Initial load
  useEffect(() => {
    let ignore = false;
    const fetchInitialData = async () => {
      try {
        const [rolesData, branchesData, deptsData, storesData, usersData] = await Promise.all([
          usersAccessService.getRoles().catch(() => [] as RoleResponse[]),
          organizationService.getBranches(undefined, true).catch(() => [] as Branch[]),
          organizationService.getDepartments(undefined, true).catch(() => [] as Department[]),
          storeService.getStores(true).catch(() => [] as Store[]),
          canView ? usersAccessService.getUsers() : Promise.resolve([] as UserResponse[]),
        ]);
        if (ignore) return;
        setRoles(rolesData);
        setBranches(branchesData);
        setDepartments(deptsData);
        setStores(storesData);
        setUsers(usersData);
      } catch (err) {
        if (!ignore) {
          setErrorMessage(extractErrorMessage(err, 'Failed to retrieve users directory.'));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void fetchInitialData();
    return () => {
      ignore = true;
    };
  }, [canView]);

  // Refresh users list (used by button and mutations)
  const refreshUsersList = useCallback(async () => {
    if (!canView) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await usersAccessService.getUsers();
      setUsers(data);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to retrieve users directory.'));
    } finally {
      setIsLoading(false);
    }
  }, [canView]);

  // Lookup maps
  const roleMap = useMemo(() => {
    const map = new Map<number, RoleResponse>();
    roles.forEach((r) => map.set(r.id, r));
    return map;
  }, [roles]);

  const branchMap = useMemo(() => {
    const map = new Map<number, Branch>();
    branches.forEach((b) => map.set(b.id, b));
    return map;
  }, [branches]);

  const departmentMap = useMemo(() => {
    const map = new Map<number, Department>();
    departments.forEach((d) => map.set(d.id, d));
    return map;
  }, [departments]);

  const storeMap = useMemo(() => {
    const map = new Map<number, Store>();
    stores.forEach((s) => map.set(s.id, s));
    return map;
  }, [stores]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Status filter
      if (statusFilter === 'active' && !u.isActive) return false;
      if (statusFilter === 'inactive' && u.isActive) return false;

      // Role filter
      if (roleFilter !== 'all') {
        const targetRoleId = Number(roleFilter);
        if (!u.roleIds.includes(targetRoleId)) return false;
      }

      // Branch filter
      if (branchFilter !== 'all') {
        const targetBranchId = Number(branchFilter);
        if (u.branchId !== targetBranchId) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = u.fullName.toLowerCase().includes(query);
        const matchUsername = u.username.toLowerCase().includes(query);
        const matchEmail = u.email.toLowerCase().includes(query);
        const matchBranch = u.branchId ? branchMap.get(u.branchId)?.name.toLowerCase().includes(query) : false;
        return matchName || matchUsername || matchEmail || matchBranch;
      }

      return true;
    });
  }, [users, statusFilter, roleFilter, branchFilter, searchQuery, branchMap]);

  // Stats
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive).length;
    const inactive = total - active;
    const assignedRoles = users.filter((u) => u.roleIds.length > 0).length;
    return { total, active, inactive, assignedRoles };
  }, [users]);

  // Create User Handlers
  const handleOpenCreate = () => {
    setCreateForm({
      fullName: '',
      username: '',
      email: '',
      password: '',
      branchId: null,
      departmentId: null,
      storeId: null,
      initialRoleId: '',
    });
    setCreateErrors({});
    setShowPassword(false);
    setIsCreateOpen(true);
  };

  const validateCreate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!createForm.fullName.trim()) errors.fullName = 'Full Name is required.';
    if (!createForm.username.trim()) errors.username = 'Username is required.';
    if (!createForm.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email.trim())) {
      errors.email = 'Enter a valid email address.';
    }
    if (!createForm.password) {
      errors.password = 'Password is required.';
    } else if (createForm.password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }
    setCreateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCreate()) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const payload: CreateUserRequest = {
        fullName: createForm.fullName.trim(),
        username: createForm.username.trim(),
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password,
        branchId: createForm.branchId ? Number(createForm.branchId) : null,
        departmentId: createForm.departmentId ? Number(createForm.departmentId) : null,
        storeId: createForm.storeId ? Number(createForm.storeId) : null,
      };

      const newUser = await usersAccessService.createUser(payload);

      // If initial role was specified and permitted, assign it
      if (createForm.initialRoleId && canAssignRole) {
        try {
          await usersAccessService.assignUserRole(newUser.id, Number(createForm.initialRoleId));
        } catch (roleErr) {
          console.warn('User created but initial role assignment failed:', roleErr);
        }
      }

      setSuccessMessage(`User "${newUser.fullName}" (${newUser.username}) created successfully.`);
      setIsCreateOpen(false);
      await refreshUsersList();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to create user.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit User Handlers
  const handleOpenEdit = (user: UserResponse) => {
    setEditingUser(user);
    setEditForm({
      fullName: user.fullName,
      email: user.email,
      branchId: user.branchId,
      departmentId: user.departmentId,
      storeId: user.storeId,
    });
    setEditErrors({});
  };

  const validateEdit = (): boolean => {
    const errors: Record<string, string> = {};
    if (!editForm.fullName.trim()) errors.fullName = 'Full Name is required.';
    if (!editForm.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) {
      errors.email = 'Enter a valid email address.';
    }
    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !validateEdit()) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const payload: UpdateUserRequest = {
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim().toLowerCase(),
        branchId: editForm.branchId ? Number(editForm.branchId) : null,
        departmentId: editForm.departmentId ? Number(editForm.departmentId) : null,
        storeId: editForm.storeId ? Number(editForm.storeId) : null,
      };

      await usersAccessService.updateUser(editingUser.id, payload);
      setSuccessMessage(`User "${payload.fullName}" updated successfully.`);
      setEditingUser(null);
      await refreshUsersList();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to update user.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Assign Role Modal Handlers
  const handleOpenAssignRole = (user: UserResponse) => {
    setRoleAssignUser(user);
    setSelectedRoleIdToAssign('');
  };

  const handleAssignRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleAssignUser || !selectedRoleIdToAssign) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await usersAccessService.assignUserRole(roleAssignUser.id, Number(selectedRoleIdToAssign));
      const roleObj = roleMap.get(Number(selectedRoleIdToAssign));
      setSuccessMessage(
        `Role "${roleObj?.name || selectedRoleIdToAssign}" assigned to ${roleAssignUser.fullName}.`
      );
      setRoleAssignUser(null);
      await refreshUsersList();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to assign role to user.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Change (Activate/Deactivate) Handlers
  const handleConfirmStatusChange = async () => {
    if (!confirmStatusUser) return;
    const { user, action } = confirmStatusUser;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (action === 'activate') {
        await usersAccessService.activateUser(user.id);
        setSuccessMessage(`User "${user.fullName}" activated successfully.`);
      } else {
        await usersAccessService.deactivateUser(user.id);
        setSuccessMessage(`User "${user.fullName}" deactivated successfully.`);
      }
      setConfirmStatusUser(null);
      await refreshUsersList();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, `Failed to ${action} user.`));
      setConfirmStatusUser(null);
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
            You do not have the <code>UserView</code> permission required to view users.
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
            <Users size={26} className="text-primary" />
            <span>Users Management</span>
          </h1>
          <p className="page-subtitle">
            Manage user accounts, organizational scopes, role assignments, and account activation.
          </p>
        </div>

        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={refreshUsersList}
            disabled={isLoading}
            title="Refresh user list"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {canCreate && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleOpenCreate}
            >
              <Plus size={16} />
              <span>New User</span>
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

      {/* Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total Accounts</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Users</div>
          <div className="stat-value text-success">{stats.active}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Inactive Users</div>
          <div className="stat-value text-danger">{stats.inactive}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Roles Assigned</div>
          <div className="stat-value text-primary">{stats.assignedRoles}</div>
        </div>
      </div>

      {/* Filter Card */}
      <div className="filter-card">
        <div className="filter-controls-group">
          {/* Status Filter */}
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Accounts Only</option>
            <option value="inactive">Inactive Accounts Only</option>
          </select>

          {/* Role Filter */}
          <select
            className="filter-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          {/* Branch Filter */}
          <select
            className="filter-select"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
          >
            <option value="all">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, username, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Table Card */}
      <div className="table-card">
        {isLoading ? (
          <div className="empty-state-container">
            <RefreshCw size={36} className="animate-spin text-muted" />
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading users directory...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state-container">
            <Users size={48} className="text-muted" />
            <h3 style={{ marginTop: '1rem' }}>No users found</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {searchQuery || statusFilter !== 'all' || roleFilter !== 'all' || branchFilter !== 'all'
                ? 'Try adjusting your search or filters to locate accounts.'
                : 'Get started by creating your first user account.'}
            </p>
            {canCreate && !searchQuery && statusFilter === 'all' && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleOpenCreate}
                style={{ marginTop: '1rem' }}
              >
                <Plus size={16} />
                <span>Create User</span>
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>User</th>
                  <th>Email</th>
                  <th>Branch / Dept</th>
                  <th>Assigned Roles</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ width: '180px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const branchObj = user.branchId ? branchMap.get(user.branchId) : null;
                  const deptObj = user.departmentId ? departmentMap.get(user.departmentId) : null;

                  return (
                    <tr key={user.id}>
                      <td className="text-muted font-mono">{user.id}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>
                          {user.fullName}
                        </div>
                        <div className="font-mono text-muted" style={{ fontSize: '0.8125rem' }}>
                          @{user.username}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.875rem' }}>{user.email}</span>
                      </td>
                      <td>
                        {branchObj || deptObj ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {branchObj && (
                              <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                                {branchObj.name}
                              </span>
                            )}
                            {deptObj && (
                              <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                                {deptObj.name}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '0.8125rem' }}>
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td>
                        {user.roleIds && user.roleIds.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {user.roleIds.map((rId) => {
                              const rObj = roleMap.get(rId);
                              return (
                                <span key={rId} className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                                  {rObj?.name || `Role #${rId}`}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                            No roles
                          </span>
                        )}
                      </td>
                      <td>
                        {user.isActive ? (
                          <span className="badge badge-success">Active</span>
                        ) : (
                          <span className="badge badge-danger">Inactive</span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons-cell" style={{ justifyContent: 'flex-end' }}>
                          {/* View details */}
                          <button
                            type="button"
                            className="btn-icon"
                            title="View user details"
                            onClick={() => setViewingUser(user)}
                          >
                            <Eye size={16} />
                          </button>

                          {/* Edit user */}
                          {canUpdate && (
                            <button
                              type="button"
                              className="btn-icon"
                              title="Edit user profile"
                              onClick={() => handleOpenEdit(user)}
                            >
                              <Edit2 size={16} />
                            </button>
                          )}

                          {/* Assign role */}
                          {canAssignRole && (
                            <button
                              type="button"
                              className="btn-icon text-primary"
                              title="Assign role"
                              onClick={() => handleOpenAssignRole(user)}
                            >
                              <Shield size={16} />
                            </button>
                          )}

                          {/* Store access shortcut */}
                          {canViewStores && (
                            <button
                              type="button"
                              className="btn-icon"
                              title="Manage store assignments"
                              onClick={() => navigate(`/users/store-assignments?userId=${user.id}`)}
                            >
                              <Warehouse size={16} />
                            </button>
                          )}

                          {/* Activate / Deactivate */}
                          {user.isActive ? (
                            canDeactivate && (
                              <button
                                type="button"
                                className="btn-icon text-danger"
                                title="Deactivate user"
                                onClick={() =>
                                  setConfirmStatusUser({ user, action: 'deactivate' })
                                }
                              >
                                <UserX size={16} />
                              </button>
                            )
                          ) : (
                            canUpdate && (
                              <button
                                type="button"
                                className="btn-icon text-success"
                                title="Activate user"
                                onClick={() =>
                                  setConfirmStatusUser({ user, action: 'activate' })
                                }
                              >
                                <UserCheck size={16} />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* CREATE USER MODAL */}
      {/* ============================================================ */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} className="text-primary" />
            <span>Create New User Account</span>
          </div>
        }
        size="lg"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsCreateOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-user-form"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create User'}
            </button>
          </>
        }
      >
        <form id="create-user-form" onSubmit={handleCreateSubmit} noValidate>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Full Name */}
            <div className="form-group">
              <label className="form-label required">Full Name</label>
              <input
                type="text"
                className={`form-input ${createErrors.fullName ? 'is-invalid' : ''}`}
                placeholder="e.g. Abdullah Khan"
                value={createForm.fullName}
                onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
              />
              {createErrors.fullName && <div className="invalid-feedback">{createErrors.fullName}</div>}
            </div>

            {/* Username */}
            <div className="form-group">
              <label className="form-label required">Username</label>
              <input
                type="text"
                className={`form-input ${createErrors.username ? 'is-invalid' : ''}`}
                placeholder="e.g. abdullah.khan"
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
              />
              {createErrors.username && <div className="invalid-feedback">{createErrors.username}</div>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
            {/* Email */}
            <div className="form-group">
              <label className="form-label required">Email Address</label>
              <input
                type="email"
                className={`form-input ${createErrors.email ? 'is-invalid' : ''}`}
                placeholder="e.g. abdullah@baitussalam.org"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              />
              {createErrors.email && <div className="invalid-feedback">{createErrors.email}</div>}
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label required">Initial Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input ${createErrors.password ? 'is-invalid' : ''}`}
                  placeholder="Min 6 characters"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {createErrors.password && <div className="invalid-feedback">{createErrors.password}</div>}
            </div>
          </div>

          <hr style={{ margin: '1.25rem 0', borderColor: 'var(--border-color)' }} />
          <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--navy-800)', marginBottom: '0.75rem' }}>
            Organizational Scope &amp; Initial Role (Optional)
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            {/* Branch */}
            <div className="form-group">
              <label className="form-label">Assigned Branch</label>
              <select
                className="form-select"
                value={createForm.branchId ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  setCreateForm({ ...createForm, branchId: val, departmentId: null });
                }}
              >
                <option value="">No Specific Branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Department */}
            <div className="form-group">
              <label className="form-label">Department</label>
              <select
                className="form-select"
                value={createForm.departmentId ?? ''}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    departmentId: e.target.value ? Number(e.target.value) : null,
                  })
                }
              >
                <option value="">No Department</option>
                {departments
                  .filter((d) => !createForm.branchId || d.branchId === createForm.branchId)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Primary Store */}
            <div className="form-group">
              <label className="form-label">Primary Store Scope</label>
              <select
                className="form-select"
                value={createForm.storeId ?? ''}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    storeId: e.target.value ? Number(e.target.value) : null,
                  })
                }
              >
                <option value="">No Specific Store</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Initial Role */}
          {canAssignRole && (
            <div className="form-group" style={{ marginTop: '0.75rem' }}>
              <label className="form-label">Initial Role Assignment</label>
              <select
                className="form-select"
                value={createForm.initialRoleId ?? ''}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    initialRoleId: e.target.value ? Number(e.target.value) : '',
                  })
                }
              >
                <option value="">None (Can be assigned later)</option>
                {roles
                  .filter((r) => r.isActive)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* EDIT USER MODAL */}
      {/* ============================================================ */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Edit2 size={20} className="text-primary" />
            <span>Edit User: {editingUser?.username}</span>
          </div>
        }
        size="md"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setEditingUser(null)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-user-form"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <form id="edit-user-form" onSubmit={handleEditSubmit} noValidate>
          <div className="form-group">
            <label className="form-label required">Full Name</label>
            <input
              type="text"
              className={`form-input ${editErrors.fullName ? 'is-invalid' : ''}`}
              value={editForm.fullName}
              onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
            />
            {editErrors.fullName && <div className="invalid-feedback">{editErrors.fullName}</div>}
          </div>

          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label className="form-label required">Email Address</label>
            <input
              type="email"
              className={`form-input ${editErrors.email ? 'is-invalid' : ''}`}
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            />
            {editErrors.email && <div className="invalid-feedback">{editErrors.email}</div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Branch Scope</label>
              <select
                className="form-select"
                value={editForm.branchId ?? ''}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    branchId: e.target.value ? Number(e.target.value) : null,
                  })
                }
              >
                <option value="">No Branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Department Scope</label>
              <select
                className="form-select"
                value={editForm.departmentId ?? ''}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    departmentId: e.target.value ? Number(e.target.value) : null,
                  })
                }
              >
                <option value="">No Department</option>
                {departments
                  .filter((d) => !editForm.branchId || d.branchId === editForm.branchId)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label className="form-label">Primary Store Scope</label>
            <select
              className="form-select"
              value={editForm.storeId ?? ''}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  storeId: e.target.value ? Number(e.target.value) : null,
                })
              }
            >
              <option value="">No Specific Store</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* ASSIGN ROLE MODAL */}
      {/* ============================================================ */}
      <Modal
        isOpen={!!roleAssignUser}
        onClose={() => setRoleAssignUser(null)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={20} className="text-primary" />
            <span>Assign Role to {roleAssignUser?.fullName}</span>
          </div>
        }
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setRoleAssignUser(null)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="assign-role-form"
              className="btn btn-primary"
              disabled={isSubmitting || !selectedRoleIdToAssign}
            >
              {isSubmitting ? 'Assigning...' : 'Assign Role'}
            </button>
          </>
        }
      >
        <form id="assign-role-form" onSubmit={handleAssignRoleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Currently assigned roles:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '0.35rem' }}>
              {roleAssignUser?.roleIds && roleAssignUser.roleIds.length > 0 ? (
                roleAssignUser.roleIds.map((rId) => {
                  const rObj = roleMap.get(rId);
                  return (
                    <span key={rId} className="badge badge-info">
                      {rObj?.name || `Role #${rId}`}
                    </span>
                  );
                })
              ) : (
                <span className="text-muted" style={{ fontSize: '0.8125rem' }}>
                  No roles currently assigned
                </span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label required">Select Role to Assign</label>
            <select
              className="form-select"
              value={selectedRoleIdToAssign}
              onChange={(e) =>
                setSelectedRoleIdToAssign(e.target.value ? Number(e.target.value) : '')
              }
              required
            >
              <option value="">-- Choose Role --</option>
              {roles
                .filter((r) => r.isActive && !roleAssignUser?.roleIds.includes(r.id))
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* VIEW USER DETAILS MODAL */}
      {/* ============================================================ */}
      <Modal
        isOpen={!!viewingUser}
        onClose={() => setViewingUser(null)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Eye size={20} className="text-primary" />
            <span>User Details: {viewingUser?.fullName}</span>
          </div>
        }
        size="md"
        footer={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setViewingUser(null)}
          >
            Close
          </button>
        }
      >
        {viewingUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
                  {viewingUser.fullName}
                </h3>
                <span className="font-mono text-muted">@{viewingUser.username}</span>
              </div>
              <div>
                {viewingUser.isActive ? (
                  <span className="badge badge-success">Active</span>
                ) : (
                  <span className="badge badge-danger">Inactive</span>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: 'var(--navy-50, #f8fafc)', padding: '0.75rem', borderRadius: '6px' }}>
              <div>
                <span className="text-muted" style={{ fontSize: '0.75rem', display: 'block' }}>Email</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{viewingUser.email}</span>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: '0.75rem', display: 'block' }}>User ID</span>
                <span className="font-mono" style={{ fontSize: '0.875rem' }}>#{viewingUser.id}</span>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: '0.75rem', display: 'block' }}>Branch</span>
                <span style={{ fontSize: '0.875rem' }}>
                  {viewingUser.branchId ? branchMap.get(viewingUser.branchId)?.name || `Branch #${viewingUser.branchId}` : 'Unscoped (Global)'}
                </span>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: '0.75rem', display: 'block' }}>Department</span>
                <span style={{ fontSize: '0.875rem' }}>
                  {viewingUser.departmentId ? departmentMap.get(viewingUser.departmentId)?.name || `Dept #${viewingUser.departmentId}` : 'None'}
                </span>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span className="text-muted" style={{ fontSize: '0.75rem', display: 'block' }}>Primary Store</span>
                <span style={{ fontSize: '0.875rem' }}>
                  {viewingUser.storeId ? storeMap.get(viewingUser.storeId)?.name || `Store #${viewingUser.storeId}` : 'None'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-muted" style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.35rem' }}>
                Assigned Roles
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {viewingUser.roleIds && viewingUser.roleIds.length > 0 ? (
                  viewingUser.roleIds.map((rId) => {
                    const rObj = roleMap.get(rId);
                    return (
                      <span key={rId} className="badge badge-info">
                        {rObj?.name || `Role #${rId}`}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-muted" style={{ fontSize: '0.8125rem' }}>
                    No roles assigned
                  </span>
                )}
              </div>
            </div>

            {canViewStores && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => {
                    setViewingUser(null);
                    navigate(`/users/store-assignments?userId=${viewingUser.id}`);
                  }}
                >
                  <Warehouse size={15} />
                  <span>Manage Authorized Stores for this User</span>
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ============================================================ */}
      {/* CONFIRM ACTIVATE / DEACTIVATE DIALOG */}
      {/* ============================================================ */}
      <ConfirmDialog
        isOpen={!!confirmStatusUser}
        onClose={() => setConfirmStatusUser(null)}
        onConfirm={handleConfirmStatusChange}
        title={confirmStatusUser?.action === 'activate' ? 'Activate User Account' : 'Deactivate User Account'}
        message={
          confirmStatusUser?.action === 'activate'
            ? `Are you sure you want to activate the account for "${confirmStatusUser?.user.fullName}" (${confirmStatusUser?.user.username})? The user will be able to log in.`
            : `Are you sure you want to deactivate the account for "${confirmStatusUser?.user.fullName}" (${confirmStatusUser?.user.username})? The user will be blocked from accessing the system.`
        }
        confirmLabel={confirmStatusUser?.action === 'activate' ? 'Activate User' : 'Deactivate User'}
        variant={confirmStatusUser?.action === 'activate' ? 'success' : 'danger'}
        isLoading={isSubmitting}
      />
    </div>
  );
};
