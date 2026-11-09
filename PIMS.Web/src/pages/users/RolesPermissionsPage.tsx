import React, { useEffect, useState, useMemo } from 'react';
import {
  Shield,
  Plus,
  RefreshCw,
  Search,
  Edit2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Key,
} from 'lucide-react';
import { usersAccessService } from '../../api/usersAccessService';
import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import type {
  RoleResponse,
  CreateRoleRequest,
  UpdateRoleRequest,
  PermissionResponse,
  CreatePermissionRequest,
} from '../../types/usersAccess';

export const RolesPermissionsPage: React.FC = () => {
  const { hasPermission } = useAuth();

  const canViewRoles = hasPermission('RoleView');
  const canCreateRole = hasPermission('RoleCreate');
  const canUpdateRole = hasPermission('RoleUpdate');
  const canViewPermissions = hasPermission('PermissionView');
  const canManagePermissions = hasPermission('PermissionManage');

  // Sub-tabs
  const [activeTab, setActiveTab] = useState<'matrix' | 'permissions'>('matrix');

  // Core Data
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [permissions, setPermissions] = useState<PermissionResponse[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [roleAssignedPermIds, setRoleAssignedPermIds] = useState<Set<number>>(new Set());

  // Loading & Alert States
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPerms, setIsLoadingPerms] = useState(false);
  const [togglingPermId, setTogglingPermId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [roleSearch, setRoleSearch] = useState('');
  const [permSearch, setPermSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');

  // Role Modals
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleResponse | null>(null);
  const [roleForm, setRoleForm] = useState<{ name: string; description: string }>({
    name: '',
    description: '',
  });
  const [roleFormErrors, setRoleFormErrors] = useState<Record<string, string>>({});

  // Status Change Dialog
  const [confirmStatusRole, setConfirmStatusRole] = useState<{
    role: RoleResponse;
    action: 'activate' | 'deactivate';
  } | null>(null);

  // Create Permission Modal
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [permForm, setPermForm] = useState<CreatePermissionRequest>({
    code: '',
    name: '',
    module: '',
  });
  const [permFormErrors, setPermFormErrors] = useState<Record<string, string>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initial load
  useEffect(() => {
    let ignore = false;
    const fetchInitial = async () => {
      try {
        const [rolesData, permsData] = await Promise.all([
          canViewRoles ? usersAccessService.getRoles() : Promise.resolve([] as RoleResponse[]),
          canViewPermissions ? usersAccessService.getPermissions() : Promise.resolve([] as PermissionResponse[]),
        ]);
        if (ignore) return;
        setRoles(rolesData);
        setPermissions(permsData);
        if (rolesData.length > 0) {
          setSelectedRoleId(rolesData[0].id);
        }
      } catch (err) {
        if (!ignore) {
          setErrorMessage(extractErrorMessage(err, 'Failed to retrieve roles or permissions.'));
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
  }, [canViewRoles, canViewPermissions]);

  // Load Permissions for Selected Role
  useEffect(() => {
    if (selectedRoleId === null || !canViewRoles) {
      return;
    }
    let ignore = false;
    const fetchRolePerms = async () => {
      try {
        const assigned = await usersAccessService.getRolePermissions(selectedRoleId);
        if (ignore) return;
        setRoleAssignedPermIds(new Set(assigned.map((p) => p.id)));
      } catch (err) {
        if (!ignore) {
          setErrorMessage(extractErrorMessage(err, 'Failed to load assigned permissions for this role.'));
        }
      } finally {
        if (!ignore) {
          setIsLoadingPerms(false);
        }
      }
    };

    void fetchRolePerms();
    return () => {
      ignore = true;
    };
  }, [selectedRoleId, canViewRoles]);

  // Refresh All Roles and Permissions (used by Refresh button)
  const refreshData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [rolesData, permsData] = await Promise.all([
        canViewRoles ? usersAccessService.getRoles() : Promise.resolve([] as RoleResponse[]),
        canViewPermissions ? usersAccessService.getPermissions() : Promise.resolve([] as PermissionResponse[]),
      ]);
      setRoles(rolesData);
      setPermissions(permsData);
      if (selectedRoleId !== null) {
        const assigned = await usersAccessService.getRolePermissions(selectedRoleId);
        setRoleAssignedPermIds(new Set(assigned.map((p) => p.id)));
      }
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to refresh roles or permissions.'));
    } finally {
      setIsLoading(false);
    }
  };

  // Selected Role Object
  const selectedRole = useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId) || null;
  }, [roles, selectedRoleId]);

  // Distinct Modules from permissions
  const modules = useMemo(() => {
    const set = new Set<string>();
    permissions.forEach((p) => {
      if (p.module) set.add(p.module);
    });
    return Array.from(set).sort();
  }, [permissions]);

  // Filtered Roles
  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      if (!roleSearch.trim()) return true;
      const q = roleSearch.toLowerCase();
      return r.name.toLowerCase().includes(q) || (r.description && r.description.toLowerCase().includes(q));
    });
  }, [roles, roleSearch]);

  // Filtered Permissions grouped by Module
  const groupedPermissions = useMemo(() => {
    const q = permSearch.toLowerCase().trim();
    const map = new Map<string, PermissionResponse[]>();

    permissions.forEach((p) => {
      if (selectedModule !== 'all' && p.module !== selectedModule) return;
      if (q && !p.name.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q)) return;

      const mod = p.module || 'General';
      if (!map.has(mod)) {
        map.set(mod, []);
      }
      map.get(mod)!.push(p);
    });

    return map;
  }, [permissions, permSearch, selectedModule]);

  // Toggle Single Permission Assignment for Role
  const handleTogglePermission = async (permissionId: number, isCurrentlyAssigned: boolean) => {
    if (!selectedRoleId || !canManagePermissions) return;

    setTogglingPermId(permissionId);
    setErrorMessage(null);
    try {
      if (isCurrentlyAssigned) {
        await usersAccessService.removeRolePermission(selectedRoleId, permissionId);
        setRoleAssignedPermIds((prev) => {
          const next = new Set(prev);
          next.delete(permissionId);
          return next;
        });
      } else {
        await usersAccessService.assignRolePermission(selectedRoleId, permissionId);
        setRoleAssignedPermIds((prev) => {
          const next = new Set(prev);
          next.add(permissionId);
          return next;
        });
      }
      // Silently refresh role list to update counts if needed
      const updatedRoles = await usersAccessService.getRoles();
      setRoles(updatedRoles);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to update permission assignment.'));
    } finally {
      setTogglingPermId(null);
    }
  };

  // Open Create Role Modal
  const handleOpenCreateRole = () => {
    setEditingRole(null);
    setRoleForm({ name: '', description: '' });
    setRoleFormErrors({});
    setIsRoleModalOpen(true);
  };

  // Open Edit Role Modal
  const handleOpenEditRole = (role: RoleResponse) => {
    setEditingRole(role);
    setRoleForm({ name: role.name, description: role.description || '' });
    setRoleFormErrors({});
    setIsRoleModalOpen(true);
  };

  // Validate and Submit Role Form
  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!roleForm.name.trim()) errors.name = 'Role Name is required.';
    setRoleFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (editingRole) {
        const payload: UpdateRoleRequest = {
          name: roleForm.name.trim(),
          description: roleForm.description.trim() || null,
        };
        await usersAccessService.updateRole(editingRole.id, payload);
        setSuccessMessage(`Role "${payload.name}" updated successfully.`);
      } else {
        const payload: CreateRoleRequest = {
          name: roleForm.name.trim(),
          description: roleForm.description.trim() || null,
        };
        const created = await usersAccessService.createRole(payload);
        setSuccessMessage(`Role "${created.name}" created successfully.`);
        setSelectedRoleId(created.id);
      }
      setIsRoleModalOpen(false);
      const updated = await usersAccessService.getRoles();
      setRoles(updated);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to save role.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Role Status Change (Activate/Deactivate)
  const handleConfirmRoleStatus = async () => {
    if (!confirmStatusRole) return;
    const { role, action } = confirmStatusRole;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (action === 'activate') {
        await usersAccessService.activateRole(role.id);
        setSuccessMessage(`Role "${role.name}" activated.`);
      } else {
        await usersAccessService.deactivateRole(role.id);
        setSuccessMessage(`Role "${role.name}" deactivated.`);
      }
      setConfirmStatusRole(null);
      const updated = await usersAccessService.getRoles();
      setRoles(updated);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, `Failed to ${action} role.`));
      setConfirmStatusRole(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create Permission Handlers
  const handleOpenCreatePerm = () => {
    setPermForm({ code: '', name: '', module: '' });
    setPermFormErrors({});
    setIsPermModalOpen(true);
  };

  const handlePermSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!permForm.code.trim()) errors.code = 'Permission Code is required.';
    if (!permForm.name.trim()) errors.name = 'Permission Name is required.';
    if (!permForm.module.trim()) errors.module = 'Module category is required.';
    setPermFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const payload: CreatePermissionRequest = {
        code: permForm.code.trim(),
        name: permForm.name.trim(),
        module: permForm.module.trim(),
      };
      await usersAccessService.createPermission(payload);
      setSuccessMessage(`Permission "${payload.code}" created.`);
      setIsPermModalOpen(false);
      const updated = await usersAccessService.getPermissions();
      setPermissions(updated);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to create permission.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canViewRoles && !canViewPermissions) {
    return (
      <div className="unauthorized-container">
        <div className="unauthorized-card">
          <div className="unauthorized-icon-wrap">
            <Lock size={40} className="text-danger" />
          </div>
          <h2>Access Restricted</h2>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
            You do not have the <code>RoleView</code> or <code>PermissionView</code> permission.
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
            <Shield size={26} className="text-primary" />
            <span>Roles &amp; Permissions</span>
          </h1>
          <p className="page-subtitle">
            Define system roles and configure granular permission capabilities.
          </p>
        </div>

        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={refreshData}
            disabled={isLoading}
            title="Refresh roles and permissions"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {canCreateRole && activeTab === 'matrix' && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleOpenCreateRole}
            >
              <Plus size={16} />
              <span>New Role</span>
            </button>
          )}

          {canManagePermissions && activeTab === 'permissions' && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleOpenCreatePerm}
            >
              <Plus size={16} />
              <span>New Permission</span>
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

      {/* Sub Tabs Navigation */}
      <div className="tabs-container" style={{ marginBottom: '1.25rem' }}>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'matrix' ? 'active' : ''}`}
          onClick={() => setActiveTab('matrix')}
        >
          <ShieldCheck size={16} />
          <span>Role-Permission Assignment</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'permissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('permissions')}
        >
          <Layers size={16} />
          <span>Permissions Catalog ({permissions.length})</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: ROLE-PERMISSION ASSIGNMENT (SPLIT VIEW) */}
      {/* ============================================================ */}
      {activeTab === 'matrix' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.25rem', alignItems: 'start' }}>
          {/* Left Column: Roles List */}
          <div className="table-card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Roles ({roles.length})</h3>
            </div>

            <div className="search-input-wrapper" style={{ marginBottom: '0.75rem' }}>
              <Search size={14} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search roles..."
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                style={{ fontSize: '0.8125rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '600px', overflowY: 'auto' }}>
              {filteredRoles.map((role) => {
                const isSelected = role.id === selectedRoleId;
                return (
                  <div
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: isSelected
                        ? '2px solid var(--primary-600, #2563eb)'
                        : '1px solid var(--border-color, #e2e8f0)',
                      backgroundColor: isSelected ? 'var(--primary-50, #eff6ff)' : '#fff',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, color: 'var(--navy-900)' }}>{role.name}</span>
                      {role.isActive ? (
                        <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>Active</span>
                      ) : (
                        <span className="badge badge-danger" style={{ fontSize: '0.6875rem' }}>Inactive</span>
                      )}
                    </div>
                    {role.description && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                        {role.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>{role.permissionIds?.length ?? 0} permissions</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {canUpdateRole && (
                          <button
                            type="button"
                            className="btn-icon"
                            style={{ padding: '2px' }}
                            title="Edit Role"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditRole(role);
                            }}
                          >
                            <Edit2 size={13} />
                          </button>
                        )}
                        {canUpdateRole && (
                          <button
                            type="button"
                            className="btn-icon"
                            style={{ padding: '2px' }}
                            title={role.isActive ? 'Deactivate Role' : 'Activate Role'}
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmStatusRole({
                                role,
                                action: role.isActive ? 'deactivate' : 'activate',
                              });
                            }}
                          >
                            {role.isActive ? <XCircle size={13} className="text-danger" /> : <CheckCircle size={13} className="text-success" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Permission Matrix for Selected Role */}
          <div className="table-card" style={{ padding: '1.25rem' }}>
            {selectedRole ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.875rem', marginBottom: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>Permissions for: {selectedRole.name}</span>
                      {selectedRole.isActive ? (
                        <span className="badge badge-success">Active</span>
                      ) : (
                        <span className="badge badge-danger">Inactive</span>
                      )}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
                      {selectedRole.description || 'No description provided.'} &bull;{' '}
                      <strong>{roleAssignedPermIds.size}</strong> of {permissions.length} capabilities assigned
                    </p>
                  </div>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div className="search-input-wrapper" style={{ flex: 1 }}>
                    <Search size={15} className="search-icon" />
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search capabilities by name or code..."
                      value={permSearch}
                      onChange={(e) => setPermSearch(e.target.value)}
                    />
                  </div>
                  <select
                    className="filter-select"
                    value={selectedModule}
                    onChange={(e) => setSelectedModule(e.target.value)}
                    style={{ minWidth: '160px' }}
                  >
                    <option value="all">All Modules ({modules.length})</option>
                    {modules.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Permission Modules Accordion / List */}
                {isLoadingPerms ? (
                  <div className="empty-state-container" style={{ padding: '2rem 0' }}>
                    <RefreshCw size={28} className="animate-spin text-muted" />
                    <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>Loading permissions...</p>
                  </div>
                ) : groupedPermissions.size === 0 ? (
                  <div className="empty-state-container" style={{ padding: '2rem 0' }}>
                    <ShieldAlert size={36} className="text-muted" />
                    <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>
                      No permissions match the current filter.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '650px', overflowY: 'auto' }}>
                    {Array.from(groupedPermissions.entries()).map(([moduleName, permList]) => {
                      const assignedInModule = permList.filter((p) => roleAssignedPermIds.has(p.id)).length;

                      return (
                        <div
                          key={moduleName}
                          style={{
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              backgroundColor: 'var(--navy-50, #f8fafc)',
                              padding: '0.625rem 1rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              borderBottom: '1px solid var(--border-color)',
                            }}
                          >
                            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--navy-900)' }}>
                              {moduleName} Module
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {assignedInModule} / {permList.length} enabled
                            </span>
                          </div>

                          <div style={{ padding: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.5rem' }}>
                            {permList.map((perm) => {
                              const isAssigned = roleAssignedPermIds.has(perm.id);
                              const isToggling = togglingPermId === perm.id;

                              return (
                                <label
                                  key={perm.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '0.5rem',
                                    padding: '0.5rem 0.625rem',
                                    borderRadius: '6px',
                                    backgroundColor: isAssigned ? '#f0fdf4' : 'transparent',
                                    border: isAssigned ? '1px solid #bbf7d0' : '1px solid #f1f5f9',
                                    cursor: canManagePermissions ? 'pointer' : 'default',
                                    opacity: perm.isActive ? 1 : 0.6,
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isAssigned}
                                    disabled={!canManagePermissions || isToggling}
                                    onChange={() => handleTogglePermission(perm.id, isAssigned)}
                                    style={{ marginTop: '3px', cursor: canManagePermissions ? 'pointer' : 'default' }}
                                  />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--navy-900)' }}>
                                      {perm.name}
                                    </div>
                                    <div className="font-mono text-muted" style={{ fontSize: '0.6875rem' }}>
                                      {perm.code}
                                    </div>
                                  </div>
                                  {isToggling && (
                                    <RefreshCw size={12} className="animate-spin text-muted" style={{ marginTop: '4px' }} />
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state-container" style={{ padding: '3rem 0' }}>
                <Shield size={48} className="text-muted" />
                <h3 style={{ marginTop: '1rem' }}>No role selected</h3>
                <p style={{ color: 'var(--text-muted)' }}>Select a role from the left to configure its permissions.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: SYSTEM PERMISSIONS CATALOG */}
      {/* ============================================================ */}
      {activeTab === 'permissions' && (
        <div className="table-card">
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
            <div className="search-input-wrapper" style={{ flex: 1 }}>
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search permission code or name..."
                value={permSearch}
                onChange={(e) => setPermSearch(e.target.value)}
              />
            </div>
            <select
              className="filter-select"
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              style={{ minWidth: '180px' }}
            >
              <option value="all">All Modules ({modules.length})</option>
              {modules.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Permission Name</th>
                  <th>Code</th>
                  <th>Module</th>
                  <th style={{ width: '100px' }}>Status</th>
                  {canManagePermissions && <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {permissions
                  .filter((p) => {
                    if (selectedModule !== 'all' && p.module !== selectedModule) return false;
                    if (permSearch.trim()) {
                      const q = permSearch.toLowerCase().trim();
                      return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
                    }
                    return true;
                  })
                  .map((perm) => (
                    <tr key={perm.id}>
                      <td className="text-muted font-mono">{perm.id}</td>
                      <td style={{ fontWeight: 500 }}>{perm.name}</td>
                      <td>
                        <span className="font-mono" style={{ fontSize: '0.8125rem', backgroundColor: 'var(--navy-50, #f8fafc)', padding: '2px 6px', borderRadius: '4px' }}>
                          {perm.code}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-info">{perm.module}</span>
                      </td>
                      <td>
                        {perm.isActive ? (
                          <span className="badge badge-success">Active</span>
                        ) : (
                          <span className="badge badge-danger">Inactive</span>
                        )}
                      </td>
                      {canManagePermissions && (
                        <td>
                          <div className="action-buttons-cell" style={{ justifyContent: 'flex-end' }}>
                            {perm.isActive ? (
                              <button
                                type="button"
                                className="btn-icon text-danger"
                                title="Deactivate Permission"
                                onClick={async () => {
                                  try {
                                    await usersAccessService.deactivatePermission(perm.id);
                                    const updated = await usersAccessService.getPermissions();
                                    setPermissions(updated);
                                  } catch (err) {
                                    setErrorMessage(extractErrorMessage(err, 'Failed to deactivate permission.'));
                                  }
                                }}
                              >
                                <XCircle size={15} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn-icon text-success"
                                title="Activate Permission"
                                onClick={async () => {
                                  try {
                                    await usersAccessService.activatePermission(perm.id);
                                    const updated = await usersAccessService.getPermissions();
                                    setPermissions(updated);
                                  } catch (err) {
                                    setErrorMessage(extractErrorMessage(err, 'Failed to activate permission.'));
                                  }
                                }}
                              >
                                <CheckCircle size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CREATE / EDIT ROLE MODAL */}
      {/* ============================================================ */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={20} className="text-primary" />
            <span>{editingRole ? `Edit Role: ${editingRole.name}` : 'Create New System Role'}</span>
          </div>
        }
        size="md"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsRoleModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="role-form"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}
            </button>
          </>
        }
      >
        <form id="role-form" onSubmit={handleRoleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label required">Role Name</label>
            <input
              type="text"
              className={`form-input ${roleFormErrors.name ? 'is-invalid' : ''}`}
              placeholder="e.g. Inventory Officer, Store Manager"
              value={roleForm.name}
              onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
            />
            {roleFormErrors.name && <div className="invalid-feedback">{roleFormErrors.name}</div>}
          </div>

          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Brief summary of duties and responsibilities assigned to this role..."
              value={roleForm.description}
              onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* CREATE PERMISSION MODAL */}
      {/* ============================================================ */}
      <Modal
        isOpen={isPermModalOpen}
        onClose={() => setIsPermModalOpen(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Key size={20} className="text-primary" />
            <span>Register New System Permission</span>
          </div>
        }
        size="md"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsPermModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="perm-form"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registering...' : 'Create Permission'}
            </button>
          </>
        }
      >
        <form id="perm-form" onSubmit={handlePermSubmit} noValidate>
          <div className="form-group">
            <label className="form-label required">Permission Code</label>
            <input
              type="text"
              className={`form-input ${permFormErrors.code ? 'is-invalid' : ''}`}
              placeholder="e.g. AuditLogExport, ReportGenerate"
              value={permForm.code}
              onChange={(e) => setPermForm({ ...permForm, code: e.target.value })}
            />
            {permFormErrors.code && <div className="invalid-feedback">{permFormErrors.code}</div>}
          </div>

          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label className="form-label required">Display Name</label>
            <input
              type="text"
              className={`form-input ${permFormErrors.name ? 'is-invalid' : ''}`}
              placeholder="e.g. Export Audit Logs"
              value={permForm.name}
              onChange={(e) => setPermForm({ ...permForm, name: e.target.value })}
            />
            {permFormErrors.name && <div className="invalid-feedback">{permFormErrors.name}</div>}
          </div>

          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label className="form-label required">Module</label>
            <input
              type="text"
              className={`form-input ${permFormErrors.module ? 'is-invalid' : ''}`}
              placeholder="e.g. Reports, Audit, Finance"
              value={permForm.module}
              onChange={(e) => setPermForm({ ...permForm, module: e.target.value })}
            />
            {permFormErrors.module && <div className="invalid-feedback">{permFormErrors.module}</div>}
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* CONFIRM STATUS CHANGE DIALOG */}
      {/* ============================================================ */}
      <ConfirmDialog
        isOpen={!!confirmStatusRole}
        onClose={() => setConfirmStatusRole(null)}
        onConfirm={handleConfirmRoleStatus}
        title={confirmStatusRole?.action === 'activate' ? 'Activate System Role' : 'Deactivate System Role'}
        message={
          confirmStatusRole?.action === 'activate'
            ? `Are you sure you want to activate the role "${confirmStatusRole?.role.name}"? Users with this role will regain all its assigned permissions.`
            : `Are you sure you want to deactivate the role "${confirmStatusRole?.role.name}"? Users with this role will temporarily lose access to its permissions.`
        }
        confirmLabel={confirmStatusRole?.action === 'activate' ? 'Activate' : 'Deactivate'}
        variant={confirmStatusRole?.action === 'activate' ? 'success' : 'danger'}
        isLoading={isSubmitting}
      />
    </div>
  );
};
