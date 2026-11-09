import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileText,
  RefreshCw,
  Search,
  Lock,
  Warehouse,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { inventoryService } from '../../api/inventoryService';
import { storeService } from '../../api/storeService';
import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  StockMovementType,
  STOCK_MOVEMENT_TYPE_LABELS,
  STOCK_MOVEMENT_TYPE_BADGE_CLASSES,
  type StockMovementResponse,
} from '../../types/inventory';
import type { Store } from '../../types/store';

function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export const StockMovementsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { hasPermission } = useAuth();
  const canView = hasPermission('InventoryView');

  const queryStoreId = searchParams.get('storeId');
  const queryItemId = searchParams.get('itemId');

  // State
  const [movements, setMovements] = useState<StockMovementResponse[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [storeFilter, setStoreFilter] = useState<string>(queryStoreId || 'all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Load Data
  const loadData = useCallback(async () => {
    if (!canView) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [movementList, storeList] = await Promise.all([
        inventoryService.getMovements(
          queryStoreId ? Number(queryStoreId) : undefined,
          queryItemId ? Number(queryItemId) : undefined
        ),
        storeService.getStores(),
      ]);

      setMovements(movementList);
      setStores(storeList);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to load stock movement audit ledger.'));
    } finally {
      setIsLoading(false);
    }
  }, [canView, queryStoreId, queryItemId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered movements
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (storeFilter !== 'all' && m.storeId !== Number(storeFilter)) {
        return false;
      }

      if (typeFilter !== 'all' && m.movementType !== Number(typeFilter)) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesRef = m.referenceNumber.toLowerCase().includes(q);
        const matchesRefType = m.referenceType.toLowerCase().includes(q);
        const matchesCode = m.itemCode.toLowerCase().includes(q);
        const matchesName = m.itemName.toLowerCase().includes(q);
        const matchesStore = m.storeName.toLowerCase().includes(q);
        const matchesNotes = (m.notes || '').toLowerCase().includes(q);
        return matchesRef || matchesRefType || matchesCode || matchesName || matchesStore || matchesNotes;
      }

      return true;
    });
  }, [movements, storeFilter, typeFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalTransactions = movements.length;

    let totalInflow = 0;
    let totalOutflow = 0;

    movements.forEach((m) => {
      const qty = Number(m.quantity);
      if (
        m.movementType === StockMovementType.GoodsReceipt ||
        m.movementType === StockMovementType.TransferIn ||
        m.movementType === StockMovementType.AdjustmentIn
      ) {
        totalInflow += qty;
      } else {
        totalOutflow += qty;
      }
    });

    const uniqueItemsCount = new Set(movements.map((m) => m.itemId)).size;

    return {
      totalTransactions,
      totalInflow,
      totalOutflow,
      uniqueItemsCount,
    };
  }, [movements]);

  // Movement direction helper
  const isStockInflow = (type: StockMovementType) => {
    return (
      type === StockMovementType.GoodsReceipt ||
      type === StockMovementType.TransferIn ||
      type === StockMovementType.AdjustmentIn
    );
  };

  // Status Badge
  const renderMovementTypeBadge = (type: StockMovementType) => {
    const badgeClass = STOCK_MOVEMENT_TYPE_BADGE_CLASSES[type] || 'badge-secondary';
    const label = STOCK_MOVEMENT_TYPE_LABELS[type] || 'Unknown';
    const inflow = isStockInflow(type);

    return (
      <span className={`badge ${badgeClass}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
        {inflow ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
        <span>{label}</span>
      </span>
    );
  };

  // Access check
  if (!canView) {
    return (
      <div className="content-container">
        <div className="card text-center" style={{ padding: '3rem 1.5rem' }}>
          <Lock size={48} className="text-muted" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--navy-900)' }}>
            Access Restricted
          </h2>
          <p className="text-muted" style={{ maxWidth: 420, margin: '0.5rem auto 0' }}>
            You do not have permission to view Stock Movement audit logs. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-title">
          <div className="page-header-icon">
            <FileText size={24} />
          </div>
          <div>
            <h1>Stock Movement Audit Ledger</h1>
            <p className="page-header-subtitle">
              Comprehensive chronological audit trail of all warehouse inventory transactions, receipts, issues, transfers, and adjustments.
            </p>
          </div>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadData}
            disabled={isLoading}
            title="Refresh movements"
          >
            <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Audit Nature Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          backgroundColor: '#f8fafc',
          border: '1px solid var(--border-subtle)',
          borderRadius: '0.375rem',
          marginBottom: '1.25rem',
          fontSize: '0.8125rem',
          color: 'var(--navy-800)',
        }}
      >
        <ShieldCheck size={18} className="text-primary" />
        <div>
          <strong>Immutable Audit Trail:</strong> Stock movements are recorded automatically by the system
          whenever warehouse transactions occur (e.g. GRN posting, transfer dispatch/receipt, cycle adjustments).
          Records cannot be altered or deleted.
        </div>
      </div>

      {/* Alert Messages */}
      {errorMessage && (
        <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={18} />
          <div style={{ flex: 1 }}>{errorMessage}</div>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: '0.2rem', color: 'inherit' }}
            onClick={() => setErrorMessage(null)}
          >
            &times;
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Total Audit Records
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--navy-900)' }}>
            {stats.totalTransactions}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Historical movement transactions
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Total Stock Inflows (+)
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--accent-emerald, #059669)' }}>
            +{stats.totalInflow.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald, #059669)', marginTop: '0.25rem' }}>
            Receipts, Transfers In &amp; Adjustments
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Total Stock Outflows (-)
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: '#dc2626' }}>
            -{stats.totalOutflow.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem' }}>
            Issues, Transfers Out &amp; Adjustments
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Active SKUs Transacted
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--blue-600)' }}>
            {stats.uniqueItemsCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Unique catalog items moved
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 400 }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '0.875rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Search Reference #, Item, Store, Notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="mov-store-filter" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Store:
              </label>
              <select
                id="mov-store-filter"
                className="form-input"
                style={{ width: 'auto', paddingRight: '2rem' }}
                value={storeFilter}
                onChange={(e) => setStoreFilter(e.target.value)}
              >
                <option value="all">All Stores</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="mov-type-filter" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Movement Type:
              </label>
              <select
                id="mov-type-filter"
                className="form-input"
                style={{ width: 'auto', paddingRight: '2rem' }}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Movement Types</option>
                <option value={StockMovementType.GoodsReceipt}>Goods Receipt (+)</option>
                <option value={StockMovementType.TransferIn}>Transfer In (+)</option>
                <option value={StockMovementType.AdjustmentIn}>Adjustment In (+)</option>
                <option value={StockMovementType.TransferOut}>Transfer Out (-)</option>
                <option value={StockMovementType.AdjustmentOut}>Adjustment Out (-)</option>
                <option value={StockMovementType.StockIssue}>Stock Issue (-)</option>
              </select>
            </div>

            {(searchQuery || storeFilter !== 'all' || typeFilter !== 'all') && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setSearchQuery('');
                  setStoreFilter('all');
                  setTypeFilter('all');
                }}
                style={{ fontSize: '0.8125rem' }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Movements Ledger Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
            <RefreshCw size={28} className="spin text-primary" style={{ margin: '0 auto 0.75rem' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
              Loading stock movement audit records...
            </p>
          </div>
        ) : filteredMovements.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
            <FileText size={48} className="text-muted" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--navy-900)' }}>
              No Movement Audit Records Found
            </h3>
            <p className="text-muted" style={{ maxWidth: 460, margin: '0.5rem auto 1.25rem' }}>
              {searchQuery || storeFilter !== 'all' || typeFilter !== 'all'
                ? 'No stock movements match your current filter criteria.'
                : 'No stock movements have occurred yet. Inventory transactions like GRN posting, store transfers, and stock adjustments will automatically populate this audit ledger.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.875rem 1rem' }}>Date &amp; Time</th>
                  <th style={{ textAlign: 'left', padding: '0.875rem 1rem' }}>Movement Type</th>
                  <th style={{ textAlign: 'left', padding: '0.875rem 1rem' }}>Item Description</th>
                  <th style={{ textAlign: 'left', padding: '0.875rem 1rem' }}>Store Location</th>
                  <th style={{ textAlign: 'right', padding: '0.875rem 1rem' }}>Quantity</th>
                  <th style={{ textAlign: 'left', padding: '0.875rem 1rem' }}>Reference #</th>
                  <th style={{ textAlign: 'left', padding: '0.875rem 1rem' }}>Audit Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map((m) => {
                  const inflow = isStockInflow(m.movementType);
                  const qty = Number(m.quantity);

                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      {/* Date & Time */}
                      <td style={{ padding: '0.875rem 1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 500, color: 'var(--navy-900)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Calendar size={13} className="text-muted" />
                          <span>{formatDateTime(m.movementDate)}</span>
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          Tx #{m.id}
                        </div>
                      </td>

                      {/* Movement Type Badge */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        {renderMovementTypeBadge(m.movementType)}
                      </td>

                      {/* Item SKU & Name */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>{m.itemName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          SKU: <strong>{m.itemCode}</strong>
                        </div>
                      </td>

                      {/* Store */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--navy-900)' }}>
                          <Warehouse size={14} className="text-muted" />
                          <span>{m.storeName}</span>
                        </div>
                      </td>

                      {/* Quantity */}
                      <td
                        style={{
                          padding: '0.875rem 1rem',
                          textAlign: 'right',
                          fontWeight: 700,
                          fontSize: '0.9375rem',
                          color: inflow ? 'var(--accent-emerald, #059669)' : '#dc2626',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {inflow ? '+' : '-'}
                        {qty.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>

                      {/* Reference Type & Number */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--navy-900)', fontSize: '0.8125rem' }}>
                          {m.referenceNumber}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          {m.referenceType}
                        </div>
                      </td>

                      {/* Notes */}
                      <td style={{ padding: '0.875rem 1rem', color: 'var(--navy-700)', fontSize: '0.8125rem', maxWidth: 260 }}>
                        {m.notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
