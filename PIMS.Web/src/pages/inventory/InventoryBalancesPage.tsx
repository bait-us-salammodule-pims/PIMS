import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Boxes,
  RefreshCw,
  Search,
  Lock,
  Warehouse,
  AlertCircle,
  CheckCircle,
  SlidersHorizontal,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { inventoryService } from '../../api/inventoryService';
import { storeService } from '../../api/storeService';
import { itemService } from '../../api/itemService';
import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import type { InventoryBalanceResponse, StockAdjustmentDto } from '../../types/inventory';
import type { Store } from '../../types/store';
import type { Item } from '../../types/item';

export const InventoryBalancesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();

  const canView = hasPermission('InventoryView');
  const canAdjust = hasPermission('InventoryAdjustment');

  const queryStoreId = searchParams.get('storeId');
  const queryItemId = searchParams.get('itemId');

  // Core Data State
  const [balances, setBalances] = useState<InventoryBalanceResponse[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [storeFilter, setStoreFilter] = useState<string>(queryStoreId || 'all');
  const [stockLevelFilter, setStockLevelFilter] = useState<'all' | 'in-stock' | 'zero-stock' | 'reserved'>('all');

  // Stock Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustStoreId, setAdjustStoreId] = useState<number | ''>('');
  const [adjustItemId, setAdjustItemId] = useState<number | ''>('');
  const [adjustType, setAdjustType] = useState<'increase' | 'decrease'>('increase');
  const [adjustQuantity, setAdjustQuantity] = useState<number | ''>('');
  const [adjustReferenceNumber, setAdjustReferenceNumber] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustValidationError, setAdjustValidationError] = useState<string | null>(null);

  // Load Data
  const loadData = useCallback(async () => {
    if (!canView) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [balanceList, storeList, itemList] = await Promise.all([
        inventoryService.getBalances(
          queryStoreId ? Number(queryStoreId) : undefined,
          queryItemId ? Number(queryItemId) : undefined
        ),
        storeService.getStores(),
        itemService.getItems(),
      ]);

      setBalances(balanceList);
      setStores(storeList);
      setItems(itemList);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to load inventory balances.'));
    } finally {
      setIsLoading(false);
    }
  }, [canView, queryStoreId, queryItemId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Active stores and items for adjustments
  const activeStores = useMemo(() => stores.filter((s) => s.isActive), [stores]);
  const activeItems = useMemo(() => items.filter((i) => i.isActive), [items]);

  // Open Adjust Modal from row or header
  const handleOpenAdjustModal = (balance?: InventoryBalanceResponse) => {
    if (balance) {
      setAdjustStoreId(balance.storeId);
      setAdjustItemId(balance.itemId);
    } else {
      setAdjustStoreId(user?.storeId || (activeStores[0]?.id ?? ''));
      setAdjustItemId(activeItems[0]?.id ?? '');
    }
    setAdjustType('increase');
    setAdjustQuantity('');
    setAdjustReferenceNumber(`ADJ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setAdjustNotes('');
    setAdjustValidationError(null);
    setIsAdjustModalOpen(true);
  };

  // Find currently selected balance for adjustment modal to show available stock
  const currentSelectedBalance = useMemo(() => {
    if (!adjustStoreId || !adjustItemId) return null;
    return (
      balances.find(
        (b) => b.storeId === Number(adjustStoreId) && b.itemId === Number(adjustItemId)
      ) || null
    );
  }, [balances, adjustStoreId, adjustItemId]);

  // Submit Adjustment
  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustValidationError(null);

    if (!adjustStoreId) {
      setAdjustValidationError('Please select a Store.');
      return;
    }

    if (!adjustItemId) {
      setAdjustValidationError('Please select an Item.');
      return;
    }

    const qty = Number(adjustQuantity);
    if (!qty || qty <= 0) {
      setAdjustValidationError('Adjustment quantity must be greater than zero.');
      return;
    }

    if (adjustType === 'decrease') {
      const available = currentSelectedBalance?.availableQuantity ?? 0;
      if (qty > available) {
        setAdjustValidationError(
          `Cannot decrease stock by ${qty}. Current available quantity in this store is ${available}.`
        );
        return;
      }
    }

    setIsActionLoading(true);
    setErrorMessage(null);

    const payload: StockAdjustmentDto = {
      storeId: Number(adjustStoreId),
      itemId: Number(adjustItemId),
      quantity: qty,
      referenceNumber: adjustReferenceNumber.trim() || null,
      notes: adjustNotes.trim() || null,
    };

    try {
      if (adjustType === 'increase') {
        await inventoryService.increaseStock(payload);
        setSuccessMessage(`Successfully credited +${qty} units to inventory.`);
      } else {
        await inventoryService.decreaseStock(payload);
        setSuccessMessage(`Successfully deducted -${qty} units from inventory.`);
      }

      setIsAdjustModalOpen(false);
      await loadData();
    } catch (err) {
      setAdjustValidationError(extractErrorMessage(err, 'Failed to complete stock adjustment.'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Filtered Balances
  const filteredBalances = useMemo(() => {
    return balances.filter((b) => {
      if (storeFilter !== 'all' && b.storeId !== Number(storeFilter)) {
        return false;
      }

      if (stockLevelFilter === 'in-stock' && b.availableQuantity <= 0) {
        return false;
      }
      if (stockLevelFilter === 'zero-stock' && b.availableQuantity > 0) {
        return false;
      }
      if (stockLevelFilter === 'reserved' && b.quantityReserved <= 0) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = b.itemCode.toLowerCase().includes(q);
        const matchesName = b.itemName.toLowerCase().includes(q);
        const matchesStore = b.storeName.toLowerCase().includes(q);
        return matchesCode || matchesName || matchesStore;
      }

      return true;
    });
  }, [balances, storeFilter, stockLevelFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalLines = balances.length;
    const totalOnHand = balances.reduce((acc, b) => acc + Number(b.quantityOnHand), 0);
    const totalReserved = balances.reduce((acc, b) => acc + Number(b.quantityReserved), 0);
    const totalAvailable = balances.reduce((acc, b) => acc + Number(b.availableQuantity), 0);
    const zeroStockCount = balances.filter((b) => b.availableQuantity <= 0).length;

    return {
      totalLines,
      totalOnHand,
      totalReserved,
      totalAvailable,
      zeroStockCount,
    };
  }, [balances]);

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
            You do not have permission to view Inventory Balances. Please contact your system administrator.
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
            <Boxes size={24} />
          </div>
          <div>
            <h1>Inventory Balances</h1>
            <p className="page-header-subtitle">
              Real-time multi-warehouse inventory positions, on-hand ledger, reserved allocations, and available stock.
            </p>
          </div>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadData}
            disabled={isLoading}
            title="Refresh stock balances"
          >
            <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          {canAdjust && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleOpenAdjustModal()}
            >
              <SlidersHorizontal size={16} />
              <span>Stock Adjustment</span>
            </button>
          )}
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

      {successMessage && (
        <div className="alert alert-success" style={{ marginBottom: '1.25rem' }}>
          <CheckCircle size={18} />
          <div style={{ flex: 1 }}>{successMessage}</div>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: '0.2rem', color: 'inherit' }}
            onClick={() => setSuccessMessage(null)}
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
            Available for Issue
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--accent-emerald, #059669)' }}>
            {stats.totalAvailable.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Net unreserved stock units
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Total On-Hand Stock
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--navy-900)' }}>
            {stats.totalOnHand.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Physical warehouse balances
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Reserved Allocations
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: '#d97706' }}>
            {stats.totalReserved.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '0.25rem' }}>
            Committed to active orders
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Tracked Store Positions
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--blue-600)' }}>
            {stats.totalLines}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {stats.zeroStockCount} out of stock
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
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 380 }}>
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
              placeholder="Search by SKU code, item name, or store..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="inv-store-filter" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Store:
              </label>
              <select
                id="inv-store-filter"
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
              <label htmlFor="inv-level-filter" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Availability:
              </label>
              <select
                id="inv-level-filter"
                className="form-input"
                style={{ width: 'auto', paddingRight: '2rem' }}
                value={stockLevelFilter}
                onChange={(e) =>
                  setStockLevelFilter(e.target.value as 'all' | 'in-stock' | 'zero-stock' | 'reserved')
                }
              >
                <option value="all">All Balances</option>
                <option value="in-stock">Available (&gt; 0)</option>
                <option value="zero-stock">Zero Stock (= 0)</option>
                <option value="reserved">Has Reserved (&gt; 0)</option>
              </select>
            </div>

            {(searchQuery || storeFilter !== 'all' || stockLevelFilter !== 'all') && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setSearchQuery('');
                  setStoreFilter('all');
                  setStockLevelFilter('all');
                }}
                style={{ fontSize: '0.8125rem' }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Balances Data Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
            <RefreshCw size={28} className="spin text-primary" style={{ margin: '0 auto 0.75rem' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
              Loading real-time inventory balances...
            </p>
          </div>
        ) : filteredBalances.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
            <Boxes size={48} className="text-muted" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--navy-900)' }}>
              No Inventory Balances Found
            </h3>
            <p className="text-muted" style={{ maxWidth: 460, margin: '0.5rem auto 1.25rem' }}>
              {searchQuery || storeFilter !== 'all' || stockLevelFilter !== 'all'
                ? 'No inventory positions match your search criteria. Try adjusting filters.'
                : 'No inventory balances have been created in any warehouse yet. Stock balances are established when Goods Receipts (GRN) are posted or via initial stock adjustments.'}
            </p>
            {canAdjust && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleOpenAdjustModal()}
              >
                <SlidersHorizontal size={16} />
                <span>Perform Initial Stock Adjustment</span>
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.875rem 1rem' }}>Item SKU &amp; Name</th>
                  <th style={{ textAlign: 'left', padding: '0.875rem 1rem' }}>Store Warehouse</th>
                  <th style={{ textAlign: 'right', padding: '0.875rem 1rem' }}>On-Hand Qty</th>
                  <th style={{ textAlign: 'right', padding: '0.875rem 1rem' }}>Reserved</th>
                  <th style={{ textAlign: 'right', padding: '0.875rem 1rem' }}>Available</th>
                  <th style={{ textAlign: 'center', padding: '0.875rem 1rem' }}>Stock Status</th>
                  <th style={{ textAlign: 'right', padding: '0.875rem 1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBalances.map((b) => {
                  const onHand = Number(b.quantityOnHand);
                  const reserved = Number(b.quantityReserved);
                  const available = Number(b.availableQuantity);

                  return (
                    <tr key={`${b.storeId}-${b.itemId}`} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      {/* Item SKU & Name */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>{b.itemName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          SKU: <strong>{b.itemCode}</strong> • Item #{b.itemId}
                        </div>
                      </td>

                      {/* Store Warehouse */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 500, color: 'var(--navy-900)' }}>
                          <Warehouse size={14} className="text-muted" />
                          <span>{b.storeName}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Store ID: #{b.storeId}
                        </div>
                      </td>

                      {/* On-Hand Qty */}
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--navy-900)' }}>
                        {onHand.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>

                      {/* Reserved Qty */}
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right', color: reserved > 0 ? '#d97706' : 'var(--text-muted)', fontWeight: reserved > 0 ? 600 : 400 }}>
                        {reserved > 0 ? reserved.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'}
                      </td>

                      {/* Available Qty */}
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontWeight: 700, fontSize: '0.9375rem', color: available > 0 ? 'var(--accent-emerald, #059669)' : '#dc2626' }}>
                        {available.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>

                      {/* Stock Status Badge */}
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                        {available > 0 ? (
                          <span className="badge badge-success">In Stock</span>
                        ) : onHand > 0 && available <= 0 ? (
                          <span className="badge badge-warning">Fully Reserved</span>
                        ) : (
                          <span className="badge badge-danger">Out of Stock</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            title="View historical stock movement audit trail for this item in this store"
                            onClick={() =>
                              navigate(`/inventory/movements?storeId=${b.storeId}&itemId=${b.itemId}`)
                            }
                          >
                            <ArrowUpRight size={13} />
                            <span>Audit</span>
                          </button>

                          {canAdjust && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              title="Adjust inventory quantity"
                              onClick={() => handleOpenAdjustModal(b)}
                            >
                              <SlidersHorizontal size={13} />
                              <span>Adjust</span>
                            </button>
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

      {/* ======================================================== */}
      {/* STOCK ADJUSTMENT MODAL                                   */}
      {/* ======================================================== */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => {
          if (!isActionLoading) setIsAdjustModalOpen(false);
        }}
        size="md"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <SlidersHorizontal size={20} className="text-primary" />
            <span>Warehouse Stock Adjustment</span>
          </div>
        }
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsAdjustModalOpen(false)}
              disabled={isActionLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              className={adjustType === 'increase' ? 'btn btn-primary' : 'btn btn-outline-danger'}
              onClick={handleAdjustStock}
              disabled={isActionLoading}
            >
              {isActionLoading ? (
                <>
                  <RefreshCw size={14} className="spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  {adjustType === 'increase' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  <span>
                    Apply {adjustType === 'increase' ? 'Credit (+)' : 'Deduction (-)'} Adjustment
                  </span>
                </>
              )}
            </button>
          </>
        }
      >
        <form onSubmit={handleAdjustStock}>
          {adjustValidationError && (
            <div className="alert alert-danger" style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
              <AlertCircle size={16} />
              <div>{adjustValidationError}</div>
            </div>
          )}

          {/* Adjustment Type Switcher */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Adjustment Direction</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                className={`btn ${adjustType === 'increase' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  backgroundColor: adjustType === 'increase' ? '#059669' : undefined,
                  borderColor: adjustType === 'increase' ? '#059669' : undefined,
                }}
                onClick={() => setAdjustType('increase')}
              >
                <TrendingUp size={16} />
                <span>Increase Stock (+)</span>
              </button>

              <button
                type="button"
                className={`btn ${adjustType === 'decrease' ? 'btn-outline-danger' : 'btn-secondary'}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  backgroundColor: adjustType === 'decrease' ? '#fee2e2' : undefined,
                  color: adjustType === 'decrease' ? '#b91c1c' : undefined,
                  borderColor: adjustType === 'decrease' ? '#ef4444' : undefined,
                }}
                onClick={() => setAdjustType('decrease')}
              >
                <TrendingDown size={16} />
                <span>Decrease Stock (-)</span>
              </button>
            </div>
          </div>

          {/* Store and Item Selection */}
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="adjust-store-select" className="form-label">
              Store Warehouse <span style={{ color: 'var(--accent-ruby)' }}>*</span>
            </label>
            <select
              id="adjust-store-select"
              className="form-input"
              value={adjustStoreId}
              onChange={(e) => setAdjustStoreId(Number(e.target.value))}
              required
            >
              <option value="" disabled>Select Store...</option>
              {activeStores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="adjust-item-select" className="form-label">
              Item SKU <span style={{ color: 'var(--accent-ruby)' }}>*</span>
            </label>
            <select
              id="adjust-item-select"
              className="form-input"
              value={adjustItemId}
              onChange={(e) => setAdjustItemId(Number(e.target.value))}
              required
            >
              <option value="" disabled>Select Item SKU...</option>
              {activeItems.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.itemCode} — {i.name}
                </option>
              ))}
            </select>
          </div>

          {/* Current Stock Banner */}
          {currentSelectedBalance && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid var(--border-subtle)',
                borderRadius: '0.375rem',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                fontSize: '0.8125rem',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)' }}>On-Hand: </span>
                <strong>{Number(currentSelectedBalance.quantityOnHand).toLocaleString()}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Reserved: </span>
                <strong>{Number(currentSelectedBalance.quantityReserved).toLocaleString()}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Available: </span>
                <strong style={{ color: Number(currentSelectedBalance.availableQuantity) > 0 ? '#059669' : '#dc2626' }}>
                  {Number(currentSelectedBalance.availableQuantity).toLocaleString()}
                </strong>
              </div>
            </div>
          )}

          {/* Quantity and Reference Number */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="adjust-qty-input" className="form-label">
                Adjustment Quantity <span style={{ color: 'var(--accent-ruby)' }}>*</span>
              </label>
              <input
                id="adjust-qty-input"
                type="number"
                step="any"
                min={0.000001}
                className="form-input"
                placeholder="e.g. 10"
                value={adjustQuantity}
                onChange={(e) =>
                  setAdjustQuantity(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))
                }
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="adjust-ref-input" className="form-label">Reference Number</label>
              <input
                id="adjust-ref-input"
                type="text"
                className="form-input"
                placeholder="e.g. ADJ-2026-001"
                maxLength={100}
                value={adjustReferenceNumber}
                onChange={(e) => setAdjustReferenceNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="adjust-notes-input" className="form-label">Adjustment Reason / Audit Notes</label>
            <textarea
              id="adjust-notes-input"
              className="form-input"
              rows={2}
              placeholder="e.g. Annual physical cycle count reconciliation, damaged packaging write-off, sample receipt..."
              maxLength={1000}
              value={adjustNotes}
              onChange={(e) => setAdjustNotes(e.target.value)}
            />
          </div>

          {adjustType === 'decrease' && (
            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '0.375rem',
                padding: '0.625rem 0.875rem',
                fontSize: '0.75rem',
                color: '#92400e',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
              }}
            >
              <AlertCircle size={16} />
              <span>
                Warning: Deducting stock permanently decreases warehouse on-hand balance and records an immutable Stock Adjustment Out audit entry.
              </span>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
};
