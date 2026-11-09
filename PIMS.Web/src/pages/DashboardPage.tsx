import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { dashboardService } from '../api/dashboardService';
import { extractErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { DashboardSummary } from '../types/dashboard';
import {
  Boxes,
  Warehouse,
  Package,
  Truck,
  ShoppingCart,
  FileText,
  FileCheck,
  Inbox,
  ArrowRightLeft,
  RefreshCw,
  AlertCircle,
  Shield,
  Activity,
  CheckCircle,
  Clock,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await dashboardService.getSummary();
      setSummary(data);
    } catch (err: unknown) {
      setErrorMessage(extractErrorMessage(err, 'Failed to retrieve live dashboard metrics.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <div className="dashboard-view">
      {/* Header Bar */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-headline">Operations Command Center</h1>
          <p className="dashboard-subheadline">
            Welcome back, <strong>{user?.fullName || user?.username}</strong>. Live operational indicators from .NET backend.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={fetchSummary}
            className="btn btn-secondary btn-sm"
            disabled={isLoading}
            title="Refresh metrics from backend"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh Metrics</span>
          </button>
        </div>
      </div>

      {/* Error State Banner */}
      {errorMessage && (
        <div className="alert-box alert-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <strong>Backend Connection Notice:</strong>
            <p style={{ marginTop: '0.25rem' }}>{errorMessage}</p>
            <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#991b1b' }}>
              Ensure your .NET API is actively running at <code>http://localhost:5204</code> and your database is accessible.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchSummary}
            className="btn btn-secondary btn-sm"
            style={{ borderColor: '#fca5a5' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton State */}
      {isLoading && !summary && (
        <div className="dashboard-stats-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="stat-card" style={{ height: '140px' }}>
              <div className="skeleton" style={{ width: '40%', height: '16px', marginBottom: '1rem' }} />
              <div className="skeleton" style={{ width: '70%', height: '32px', marginBottom: '0.75rem' }} />
              <div className="skeleton" style={{ width: '90%', height: '12px' }} />
            </div>
          ))}
        </div>
      )}

      {/* Live Operational Metrics Cards */}
      {summary && (
        <>
          <div className="dashboard-stats-grid">
            {/* Stat: Available Inventory Quantity */}
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-label">Available Inventory</span>
                <div className="stat-icon-wrapper" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                  <Boxes size={22} />
                </div>
              </div>
              <div className="stat-value">
                {Number(summary.totalAvailableQuantity).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </div>
              <div className="stat-footer">
                <span>On-Hand: {Number(summary.totalQuantityOnHand).toLocaleString()}</span>
                <span>•</span>
                <span style={{ color: '#d97706' }}>
                  Reserved: {Number(summary.totalQuantityReserved).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Stat: Purchase Requests */}
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-label">Purchase Requests</span>
                <div className="stat-icon-wrapper" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
                  <ShoppingCart size={22} />
                </div>
              </div>
              <div className="stat-value">{summary.totalPurchaseRequests}</div>
              <div className="stat-footer">
                <span style={{ color: '#d97706', fontWeight: 600 }}>
                  {summary.pendingPurchaseRequests} Pending
                </span>
                <span>•</span>
                <span style={{ color: '#10b981' }}>
                  {summary.approvedPurchaseRequests} Approved
                </span>
              </div>
            </div>

            {/* Stat: Purchase Orders */}
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-label">Purchase Orders</span>
                <div className="stat-icon-wrapper" style={{ backgroundColor: '#f5f3ff', color: '#7c3aed' }}>
                  <FileText size={22} />
                </div>
              </div>
              <div className="stat-value">{summary.totalPurchaseOrders}</div>
              <div className="stat-footer">
                <span style={{ color: '#7c3aed', fontWeight: 600 }}>
                  {summary.pendingPurchaseOrders} Pending Approval
                </span>
              </div>
            </div>

            {/* Stat: Goods Receipts (GRN) */}
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-label">Goods Receipts (GRN)</span>
                <div className="stat-icon-wrapper" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                  <Inbox size={22} />
                </div>
              </div>
              <div className="stat-value">{summary.totalGoodsReceipts}</div>
              <div className="stat-footer">
                <span style={{ color: '#d97706' }}>
                  {summary.pendingGoodsReceipts} Awaiting Inspection / Post
                </span>
              </div>
            </div>

            {/* Stat: Item Catalog */}
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-label">Items Master</span>
                <div className="stat-icon-wrapper" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                  <Package size={22} />
                </div>
              </div>
              <div className="stat-value">{summary.totalItems}</div>
              <div className="stat-footer">
                <span style={{ color: '#16a34a' }}>
                  {summary.totalActiveItems} Active Catalog Items
                </span>
              </div>
            </div>

            {/* Stat: Stores */}
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-label">Active Stores</span>
                <div className="stat-icon-wrapper" style={{ backgroundColor: '#eff6ff', color: '#3b82f6' }}>
                  <Warehouse size={22} />
                </div>
              </div>
              <div className="stat-value">{summary.totalActiveStores}</div>
              <div className="stat-footer">
                <span>{summary.totalStores} Total Configured Stores</span>
              </div>
            </div>

            {/* Stat: Vendors */}
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-label">Vendor Directory</span>
                <div className="stat-icon-wrapper" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
                  <Truck size={22} />
                </div>
              </div>
              <div className="stat-value">{summary.totalVendors}</div>
              <div className="stat-footer">
                <span style={{ color: '#16a34a' }}>
                  {summary.totalActiveVendors} Active Suppliers
                </span>
              </div>
            </div>

            {/* Stat: Stock Transfers */}
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-label">Stock Transfers</span>
                <div className="stat-icon-wrapper" style={{ backgroundColor: '#f8fafc', color: '#475569' }}>
                  <ArrowRightLeft size={22} />
                </div>
              </div>
              <div className="stat-value">{summary.totalStockTransfers}</div>
              <div className="stat-footer">
                <span>{summary.pendingStockTransfers} Pending</span>
                <span>•</span>
                <span style={{ color: '#2563eb' }}>{summary.dispatchedStockTransfers} In-Transit</span>
              </div>
            </div>
          </div>

          {/* Section: Operational Overview & System Info */}
          <div className="dashboard-sections-grid">
            {/* Module Shortcuts Panel */}
            <div className="dashboard-panel">
              <div className="panel-title-bar">
                <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={20} className="text-primary" />
                  <span>Supply Chain &amp; Inventory Navigation</span>
                </h2>
                <span className="badge badge-primary">Modules Overview</span>
              </div>

              <div className="module-shortcuts-grid">
                <Link to="/procurement/requests" className="module-card">
                  <div className="module-card-icon">
                    <ShoppingCart size={22} />
                  </div>
                  <div className="module-card-info">
                    <span className="module-card-name">Purchase Requests</span>
                    <span className="module-card-desc">Create and route purchase requisitions</span>
                  </div>
                  <ArrowUpRight size={18} className="text-muted" style={{ marginLeft: 'auto' }} />
                </Link>

                <Link to="/procurement/quotations" className="module-card">
                  <div className="module-card-icon">
                    <FileText size={22} />
                  </div>
                  <div className="module-card-info">
                    <span className="module-card-name">Quotations &amp; RFQs</span>
                    <span className="module-card-desc">Compare supplier bids and select awards</span>
                  </div>
                  <ArrowUpRight size={18} className="text-muted" style={{ marginLeft: 'auto' }} />
                </Link>

                <Link to="/procurement/orders" className="module-card">
                  <div className="module-card-icon">
                    <FileCheck size={22} />
                  </div>
                  <div className="module-card-info">
                    <span className="module-card-name">Purchase Orders (PO)</span>
                    <span className="module-card-desc">Issue, approve and track supplier purchase orders</span>
                  </div>
                  <ArrowUpRight size={18} className="text-muted" style={{ marginLeft: 'auto' }} />
                </Link>

                <Link to="/receiving/goods-receipts" className="module-card">
                  <div className="module-card-icon">
                    <Inbox size={22} />
                  </div>
                  <div className="module-card-info">
                    <span className="module-card-name">Goods Receipts (GRN)</span>
                    <span className="module-card-desc">Inspect deliveries and post to inventory</span>
                  </div>
                  <ArrowUpRight size={18} className="text-muted" style={{ marginLeft: 'auto' }} />
                </Link>

                <Link to="/inventory/balances" className="module-card">
                  <div className="module-card-icon">
                    <Boxes size={22} />
                  </div>
                  <div className="module-card-info">
                    <span className="module-card-name">Stock Balances</span>
                    <span className="module-card-desc">View on-hand and available quantities</span>
                  </div>
                  <ArrowUpRight size={18} className="text-muted" style={{ marginLeft: 'auto' }} />
                </Link>

                <Link to="/inventory/transfers" className="module-card">
                  <div className="module-card-icon">
                    <ArrowRightLeft size={22} />
                  </div>
                  <div className="module-card-info">
                    <span className="module-card-name">Stock Transfers</span>
                    <span className="module-card-desc">Inter-store transfers and transit logs</span>
                  </div>
                  <ArrowUpRight size={18} className="text-muted" style={{ marginLeft: 'auto' }} />
                </Link>

                <Link to="/items/catalog" className="module-card">
                  <div className="module-card-icon">
                    <Package size={22} />
                  </div>
                  <div className="module-card-info">
                    <span className="module-card-name">Items Catalog</span>
                    <span className="module-card-desc">Manage SKUs, categories, and pricing</span>
                  </div>
                  <ArrowUpRight size={18} className="text-muted" style={{ marginLeft: 'auto' }} />
                </Link>
              </div>
            </div>

            {/* System Status & Session Scope */}
            <div className="dashboard-panel">
              <div className="panel-title-bar">
                <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={20} className="text-primary" />
                  <span>Session &amp; Security Scope</span>
                </h2>
              </div>

              <div>
                <div className="status-item">
                  <span className="status-label">
                    <CheckCircle size={15} color="#10b981" />
                    Backend API
                  </span>
                  <span className="status-value" style={{ color: '#10b981' }}>
                    Connected (HTTP 5204)
                  </span>
                </div>

                <div className="status-item">
                  <span className="status-label">
                    <Shield size={15} color="#3b82f6" />
                    Active Roles
                  </span>
                  <span className="status-value">
                    {user?.roles?.join(', ') || 'None'}
                  </span>
                </div>

                <div className="status-item">
                  <span className="status-label">
                    <Shield size={15} color="#3b82f6" />
                    Permissions Granted
                  </span>
                  <span className="status-value">
                    {user?.permissions?.length ?? 0} capabilities
                  </span>
                </div>

                <div className="status-item">
                  <span className="status-label">
                    <Warehouse size={15} color="#64748b" />
                    Default Store Scope
                  </span>
                  <span className="status-value">
                    {user?.storeId ? `Store #${user.storeId}` : 'Enterprise / Global'}
                  </span>
                </div>

                <div className="status-item">
                  <span className="status-label">
                    <Clock size={15} color="#64748b" />
                    Department Scope
                  </span>
                  <span className="status-value">
                    {user?.departmentId ? `Department #${user.departmentId}` : 'All Departments'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
