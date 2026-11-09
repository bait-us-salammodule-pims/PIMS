
namespace PIMS.Application.DTOs.Dashboard;

public sealed record DashboardSummaryDto(
    int TotalStores,
    int TotalActiveStores,
    int TotalItems,
    int TotalActiveItems,
    int TotalVendors,
    int TotalActiveVendors,
    int TotalPurchaseRequests,
    int PendingPurchaseRequests,
    int ApprovedPurchaseRequests,
    int TotalQuotations,
    int PendingQuotationComparisons,
    int TotalPurchaseOrders,
    int PendingPurchaseOrders,
    int TotalGoodsReceipts,
    int PendingGoodsReceipts,
    int TotalInventoryBalances,
    decimal TotalQuantityOnHand,
    decimal TotalQuantityReserved,
    decimal TotalAvailableQuantity,
    int TotalStockTransfers,
    int PendingStockTransfers,
    int ApprovedStockTransfers,
    int DispatchedStockTransfers
);
