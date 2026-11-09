// PIMS Dashboard Types
// Sourced strictly from PIMS.Application.DTOs.Dashboard.DashboardSummaryDto

export interface DashboardSummary {
  totalStores: number;
  totalActiveStores: number;
  totalItems: number;
  totalActiveItems: number;
  totalVendors: number;
  totalActiveVendors: number;
  totalPurchaseRequests: number;
  pendingPurchaseRequests: number;
  approvedPurchaseRequests: number;
  totalQuotations: number;
  pendingQuotationComparisons: number;
  totalPurchaseOrders: number;
  pendingPurchaseOrders: number;
  totalGoodsReceipts: number;
  pendingGoodsReceipts: number;
  totalInventoryBalances: number;
  totalQuantityOnHand: number;
  totalQuantityReserved: number;
  totalAvailableQuantity: number;
  totalStockTransfers: number;
  pendingStockTransfers: number;
  approvedStockTransfers: number;
  dispatchedStockTransfers: number;
}
