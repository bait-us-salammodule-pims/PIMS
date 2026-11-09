import React, { useEffect, useState, useMemo } from 'react';
import {
  FolderTree,
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lock,
  Layers,
  Shield,
  Eye,
  EyeOff,
  Info,
} from 'lucide-react';
import { usersAccessService } from '../../api/usersAccessService';
import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import type {
  TabDto,
  CreateTabDto,
  RoleResponse,
  RoleTabAccessDto,
} from '../../types/usersAccess';

export const TabsAccessPage: React.FC = () => {
  const { hasPermission } = useAuth();

  const canViewTabs = hasPermission('SystemConfigurationView');
  const canManageTabs = hasPermission('SystemConfigurationManage');
  const canViewRoles = hasPermission('RoleView');
  const canUpdateRole = hasPermission('RoleUpdate');

  // Sub-tabs
  const [activeTab, setActiveTab] = useState<'role-tabs' | 'all-tabs'>('role-tabs');

  // Core Data
  const [tabs, setTabs] = useState<TabDto[]>([]);
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('');
  const [roleTabs, setRoleTabs] = useState<RoleTabAccessDto[]>([]);

  // Loading & Alert States
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRoleTabs, setIsLoadingRoleTabs] = useState(false);
  const [togglingTabId, setTogglingTabId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [tabSearch, setTabSearch] = useState('');

  // Create Tab Modal
  const [isCreateTabOpen, setIsCreateTabOpen] = useState(false);
  const [createTabForm, setCreateTabForm] = useState<CreateTabDto>({
    name: '',
    code: '',
    route: '',
    icon: '',
    sortOrder: 0,
  });
  const [createTabErrors, setCreateTabErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initial Load (All Tabs and Roles)
  useEffect(() => {
    let ignore = false;
    const fetchInitial = async () => {
      try {
        const [tabsData, rolesData] = await Promise.all([
          canViewTabs ? usersAccessService.getTabs() : Promise.resolve([] as TabDto[]),
          canViewRoles ? usersAccessService.getRoles() : Promise.resolve([] as RoleResponse[]),
        ]);
        if (ignore) return;
        setTabs(tabsData);
        setRoles(rolesData);
        if (rolesData.length > 0) {
          const firstActive = rolesData.find((r) => r.isActive) || rolesData[0];
          setSelectedRoleId(firstActive.id);
        }
      } catch (err) {
        if (!ignore) {
          setErrorMessage(extractErrorMessage(err, 'Failed to retrieve system tabs or roles.'));
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
  }, [canViewTabs, canViewRoles]);

  // Load Role Tabs when selected role changes
  useEffect(() => {
    if (!selectedRoleId || typeof selectedRoleId !== 'number' || !canViewRoles) {
      return;
    }
    let ignore = false;
    const fetchRoleTabs = async () => {
      try {
        const data = await usersAccessService.getRoleTabs(selectedRoleId);
        if (ignore) return;
        setRoleTabs(data);
      } catch (err) {
        if (!ignore) {
          setErrorMessage(extractErrorMessage(err, 'Failed to load tab access for this role.'));
        }
      } finally {
        if (!ignore) {
          setIsLoadingRoleTabs(false);
        }
      }
    };

    void fetchRoleTabs();
    return () => {
      ignore = true;
    };
  }, [selectedRoleId, canViewRoles]);

  // Refresh All Data (used by Refresh button)
  const refreshData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [tabsData, rolesData] = await Promise.all([
        canViewTabs ? usersAccessService.getTabs() : Promise.resolve([] as TabDto[]),
        canViewRoles ? usersAccessService.getRoles() : Promise.resolve([] as RoleResponse[]),
      ]);
      setTabs(tabsData);
      setRoles(rolesData);
      if (selectedRoleId && typeof selectedRoleId === 'number') {
        const roleTabsData = await usersAccessService.getRoleTabs(selectedRoleId);
        setRoleTabs(roleTabsData);
      }
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to refresh tabs or roles.'));
    } finally {
      setIsLoading(false);
    }
  };

  // Role Tab Access Map: TabId -> RoleTabAccessDto
  const roleTabMap = useMemo(() => {
    const map = new Map<number, RoleTabAccessDto>();
    roleTabs.forEach((rt) => map.set(rt.tabId, rt));
    return map;
  }, [roleTabs]);

  // Selected Role Object
  const selectedRole = useMemo(() => {
    if (!selectedRoleId) return null;
    return roles.find((r) => r.id === Number(selectedRoleId)) || null;
  }, [roles, selectedRoleId]);

  // Filtered Tabs
  const filteredTabs = useMemo(() => {
    return tabs.filter((t) => {
      if (!tabSearch.trim()) return true;
      const q = tabSearch.toLowerCase().trim();
      return (
        t.name.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        (t.route && t.route.toLowerCase().includes(q))
      );
    });
  }, [tabs, tabSearch]);

  // Toggle Tab Access for Selected Role
  const handleToggleTabAccess = async (tabId: number, currentlyHasAccess: boolean) => {
    if (!selectedRoleId || typeof selectedRoleId !== 'number' || !canUpdateRole) return;

    setTogglingTabId(tabId);
    setErrorMessage(null);
    try {
      if (currentlyHasAccess) {
        // Remove access
        await usersAccessService.removeRoleTab(selectedRoleId, tabId);
        setRoleTabs((prev) => prev.filter((item) => item.tabId !== tabId));
        setSuccessMessage('Tab access revoked for this role.');
      } else {
        // Grant access
        const assigned = await usersAccessService.assignRoleTab(selectedRoleId, {
          tabId,
          canView: true,
        });
        setRoleTabs((prev) => [...prev.filter((item) => item.tabId !== tabId), assigned]);
        setSuccessMessage('Tab access granted for this role.');
      }
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to update tab access configuration.'));
    } finally {
      setTogglingTabId(null);
    }
  };

  // Open Create Tab Modal
  const handleOpenCreateTab = () => {
    setCreateTabForm({
      name: '',
      code: '',
      route: '',
      icon: '',
      sortOrder: (tabs.length + 1) * 10,
    });
    setCreateTabErrors({});
    setIsCreateTabOpen(true);
  };

  // Validate and Submit Create Tab
  const handleCreateTabSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!createTabForm.name.trim()) errors.name = 'Tab Name is required.';
    if (!createTabForm.code.trim()) errors.code = 'Tab Code is required.';
    setCreateTabErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const payload: CreateTabDto = {
        name: createTabForm.name.trim(),
        code: createTabForm.code.trim(),
        route: createTabForm.route?.trim() || null,
        icon: createTabForm.icon?.trim() || null,
        sortOrder: Number(createTabForm.sortOrder) || 0,
      };

      const newTab = await usersAccessService.createTab(payload);
      setSuccessMessage(`System Tab "${newTab.name}" created successfully.`);
      setIsCreateTabOpen(false);
      const updated = await usersAccessService.getTabs();
      setTabs(updated);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to register tab.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canViewTabs && !canViewRoles) {
    return (
      <div className="unauthorized-container">
        <div className="unauthorized-card">
          <div className="unauthorized-icon-wrap">
            <Lock size={40} className="text-danger" />
          </div>
          <h2>Access Restricted</h2>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
            You do not have the <code>SystemConfigurationView</code> or <code>RoleView</code> permission.
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
            <span>Role Tab Access Configuration</span>
          </h1>
          <p className="page-subtitle">
            Configure role-based tab navigation policies and view system tab definitions.
          </p>
        </div>

        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={refreshData}
            disabled={isLoading}
            title="Refresh tabs and roles"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {canManageTabs && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleOpenCreateTab}
            >
              <Plus size={16} />
              <span>Register Tab</span>
            </button>
          )}
        </div>
      </div>

      {/* Info Callout */}
      <div className="alert-box alert-info" style={{ marginBottom: '1.25rem' }}>
        <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ flex: 1, fontSize: '0.875rem', lineHeight: 1.5 }}>
          <strong>Tab Access Architecture:</strong> Tab access configurations define backend-persisted navigation visibility records per system role. These policies indicate intended UI menu item availability, operating together with granular endpoint permissions.
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

      {/* Sub-Tabs */}
      <div className="tabs-container" style={{ marginBottom: '1.25rem' }}>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'role-tabs' ? 'active' : ''}`}
          onClick={() => setActiveTab('role-tabs')}
        >
          <Shield size={16} />
          <span>Role Tab Access Matrix</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'all-tabs' ? 'active' : ''}`}
          onClick={() => setActiveTab('all-tabs')}
        >
          <Layers size={16} />
          <span>All Registered Tabs ({tabs.length})</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: ROLE TAB ACCESS MATRIX */}
      {/* ============================================================ */}
      {activeTab === 'role-tabs' && (
        <div>
          {/* Role Selector Card */}
          <div className="filter-card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
              <label style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--navy-900)', whiteSpace: 'nowrap' }}>
                Select Role to Configure:
              </label>
              <select
                className="filter-select"
                value={selectedRoleId}
                onChange={(e) =>
                  setSelectedRoleId(e.target.value ? Number(e.target.value) : '')
                }
                style={{ maxWidth: '320px' }}
              >
                <option value="">-- Choose Role --</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.isActive ? '' : '(Inactive)'}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="search-input-wrapper" style={{ minWidth: '260px' }}>
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Filter tabs..."
                value={tabSearch}
                onChange={(e) => setTabSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Tab Access Table */}
          <div className="table-card">
            {selectedRole ? (
              <>
                <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--navy-50, #f8fafc)' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>
                      Tab Access for Role: <span className="text-primary">{selectedRole.name}</span>
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {roleTabs.filter((rt) => rt.canView).length} of {tabs.length} tabs accessible
                    </span>
                  </div>
                  {isLoadingRoleTabs && (
                    <RefreshCw size={16} className="animate-spin text-muted" />
                  )}
                </div>

                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '60px' }}>Order</th>
                        <th>Tab Name</th>
                        <th>Code</th>
                        <th>Route</th>
                        <th>Icon</th>
                        <th style={{ width: '130px' }}>Access Status</th>
                        <th style={{ width: '140px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTabs.map((tab) => {
                        const roleTabRecord = roleTabMap.get(tab.id);
                        const hasAccess = !!roleTabRecord && roleTabRecord.canView;
                        const isToggling = togglingTabId === tab.id;

                        return (
                          <tr key={tab.id}>
                            <td className="text-muted font-mono">{tab.sortOrder}</td>
                            <td style={{ fontWeight: 600, color: 'var(--navy-900)' }}>
                              {tab.name}
                            </td>
                            <td>
                              <span className="font-mono text-muted" style={{ fontSize: '0.8125rem' }}>
                                {tab.code}
                              </span>
                            </td>
                            <td>
                              <span className="font-mono" style={{ fontSize: '0.8125rem', color: 'var(--primary-600)' }}>
                                {tab.route || '—'}
                              </span>
                            </td>
                            <td>
                              <span className="text-muted" style={{ fontSize: '0.8125rem' }}>
                                {tab.icon || '—'}
                              </span>
                            </td>
                            <td>
                              {hasAccess ? (
                                <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <Eye size={12} />
                                  <span>Can View</span>
                                </span>
                              ) : (
                                <span className="badge badge-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <EyeOff size={12} />
                                  <span>No Access</span>
                                </span>
                              )}
                            </td>
                            <td>
                              <div className="action-buttons-cell" style={{ justifyContent: 'flex-end' }}>
                                {canUpdateRole ? (
                                  <button
                                    type="button"
                                    className={`btn btn-sm ${hasAccess ? 'btn-outline-danger' : 'btn-outline-primary'}`}
                                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                    onClick={() => handleToggleTabAccess(tab.id, hasAccess)}
                                    disabled={isToggling}
                                  >
                                    {isToggling ? (
                                      <RefreshCw size={12} className="animate-spin" />
                                    ) : hasAccess ? (
                                      <>
                                        <XCircle size={12} />
                                        <span>Revoke</span>
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle size={12} />
                                        <span>Grant</span>
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                                    View only
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="empty-state-container" style={{ padding: '3rem 0' }}>
                <Shield size={48} className="text-muted" />
                <h3 style={{ marginTop: '1rem' }}>No role selected</h3>
                <p style={{ color: 'var(--text-muted)' }}>
                  Please select a system role above to view and configure its tab visibility.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: ALL REGISTERED SYSTEM TABS */}
      {/* ============================================================ */}
      {activeTab === 'all-tabs' && (
        <div className="table-card">
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="search-input-wrapper" style={{ maxWidth: '360px' }}>
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search tabs by name or code..."
                value={tabSearch}
                onChange={(e) => setTabSearch(e.target.value)}
              />
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Note: Backend supports tab listing and creation via <code>/api/tabs</code>.
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th style={{ width: '80px' }}>Sort</th>
                  <th>Tab Name</th>
                  <th>Code</th>
                  <th>Route</th>
                  <th>Icon Identifier</th>
                  <th style={{ width: '100px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTabs.map((tab) => (
                  <tr key={tab.id}>
                    <td className="text-muted font-mono">{tab.id}</td>
                    <td className="font-mono">{tab.sortOrder}</td>
                    <td style={{ fontWeight: 600 }}>{tab.name}</td>
                    <td>
                      <span className="font-mono" style={{ fontSize: '0.8125rem', backgroundColor: 'var(--navy-50, #f8fafc)', padding: '2px 6px', borderRadius: '4px' }}>
                        {tab.code}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-primary" style={{ fontSize: '0.8125rem' }}>
                        {tab.route || '—'}
                      </span>
                    </td>
                    <td className="text-muted" style={{ fontSize: '0.8125rem' }}>
                      {tab.icon || '—'}
                    </td>
                    <td>
                      {tab.isActive ? (
                        <span className="badge badge-success">Active</span>
                      ) : (
                        <span className="badge badge-danger">Inactive</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* REGISTER TAB MODAL */}
      {/* ============================================================ */}
      <Modal
        isOpen={isCreateTabOpen}
        onClose={() => setIsCreateTabOpen(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={20} className="text-primary" />
            <span>Register New Navigation Tab</span>
          </div>
        }
        size="md"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsCreateTabOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-tab-form"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registering...' : 'Register Tab'}
            </button>
          </>
        }
      >
        <form id="create-tab-form" onSubmit={handleCreateTabSubmit} noValidate>
          <div className="form-group">
            <label className="form-label required">Tab Display Name</label>
            <input
              type="text"
              className={`form-input ${createTabErrors.name ? 'is-invalid' : ''}`}
              placeholder="e.g. Stock Balances, Purchase Orders"
              value={createTabForm.name}
              onChange={(e) => setCreateTabForm({ ...createTabForm, name: e.target.value })}
            />
            {createTabErrors.name && <div className="invalid-feedback">{createTabErrors.name}</div>}
          </div>

          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label className="form-label required">Tab Code</label>
            <input
              type="text"
              className={`form-input ${createTabErrors.code ? 'is-invalid' : ''}`}
              placeholder="e.g. TAB_STOCK_BALANCES"
              value={createTabForm.code}
              onChange={(e) => setCreateTabForm({ ...createTabForm, code: e.target.value })}
            />
            {createTabErrors.code && <div className="invalid-feedback">{createTabErrors.code}</div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Route URL</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. /inventory/balances"
                value={createTabForm.route || ''}
                onChange={(e) => setCreateTabForm({ ...createTabForm, route: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Icon Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Boxes, Warehouse"
                value={createTabForm.icon || ''}
                onChange={(e) => setCreateTabForm({ ...createTabForm, icon: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label className="form-label">Sort Order</label>
            <input
              type="number"
              className="form-input"
              value={createTabForm.sortOrder}
              onChange={(e) =>
                setCreateTabForm({ ...createTabForm, sortOrder: parseInt(e.target.value, 10) || 0 })
              }
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
