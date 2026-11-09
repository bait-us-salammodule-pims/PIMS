
using Microsoft.EntityFrameworkCore;
using PIMS.Application.DTOs.Dashboard;
using PIMS.Application.Interfaces.Dashboard;
using PIMS.Domain.Enums;
using PIMS.Infrastructure.Persistence;

namespace PIMS.Infrastructure.Services.Dashboard;

public sealed class DashboardService : IDashboardService
{
    private readonly PimsDbContext _db;

    public DashboardService(PimsDbContext db)
    {
        _db = db;
    }

    public async Task<DashboardSummaryDto> GetSummaryAsync(
        CancellationToken cancellationToken = default)
    {
        var totalQuantityOnHand =
            await _db.InventoryBalances
                .SumAsync(
                    x => (decimal?)x.QuantityOnHand,
                    cancellationToken) ?? 0m;

        var totalQuantityReserved =
            await _db.InventoryBalances
                .SumAsync(
                    x => (decimal?)x.QuantityReserved,
                    cancellationToken) ?? 0m;

        var pendingPurchaseRequests =
            await _db.PurchaseRequests.CountAsync(
                x => x.Status == PurchaseRequestStatus.Submitted ||
                     x.Status == PurchaseRequestStatus.UnderReview,
                cancellationToken);

        var approvedPurchaseRequests =
            await _db.PurchaseRequests.CountAsync(
                x => x.Status == PurchaseRequestStatus.Approved,
                cancellationToken);

        var pendingQuotationComparisons =
            await _db.QuotationRequests.CountAsync(
                x => x.Status == QuotationStatus.ResponsesReceived ||
                     x.Status == QuotationStatus.UnderComparison,
                cancellationToken);

        var pendingPurchaseOrders =
            await _db.PurchaseOrders.CountAsync(
                x => x.Status == PurchaseOrderStatus.Draft ||
                     x.Status == PurchaseOrderStatus.PendingApproval,
                cancellationToken);

        var pendingGoodsReceipts =
            await _db.GoodsReceipts.CountAsync(
                x => x.Status == GoodsReceiptStatus.Submitted,
                cancellationToken);

        var pendingStockTransfers =
            await _db.StockTransfers.CountAsync(
                x => x.Status == StockTransferStatus.Submitted,
                cancellationToken);

        var approvedStockTransfers =
            await _db.StockTransfers.CountAsync(
                x => x.Status == StockTransferStatus.Approved,
                cancellationToken);

        var dispatchedStockTransfers =
            await _db.StockTransfers.CountAsync(
                x => x.Status == StockTransferStatus.Dispatched,
                cancellationToken);

        return new DashboardSummaryDto(
            TotalStores: await _db.Stores.CountAsync(cancellationToken),
            TotalActiveStores: await _db.Stores.CountAsync(
                x => x.IsActive, cancellationToken),

            TotalItems: await _db.Items.CountAsync(cancellationToken),
            TotalActiveItems: await _db.Items.CountAsync(
                x => x.IsActive, cancellationToken),

            TotalVendors: await _db.Vendors.CountAsync(cancellationToken),
            TotalActiveVendors: await _db.Vendors.CountAsync(
                x => x.IsActive, cancellationToken),

            TotalPurchaseRequests:
                await _db.PurchaseRequests.CountAsync(cancellationToken),
            PendingPurchaseRequests: pendingPurchaseRequests,
            ApprovedPurchaseRequests: approvedPurchaseRequests,

            TotalQuotations:
                await _db.QuotationRequests.CountAsync(cancellationToken),
            PendingQuotationComparisons: pendingQuotationComparisons,

            TotalPurchaseOrders:
                await _db.PurchaseOrders.CountAsync(cancellationToken),
            PendingPurchaseOrders: pendingPurchaseOrders,

            TotalGoodsReceipts:
                await _db.GoodsReceipts.CountAsync(cancellationToken),
            PendingGoodsReceipts: pendingGoodsReceipts,

            TotalInventoryBalances:
                await _db.InventoryBalances.CountAsync(cancellationToken),
            TotalQuantityOnHand: totalQuantityOnHand,
            TotalQuantityReserved: totalQuantityReserved,
            TotalAvailableQuantity:
                totalQuantityOnHand - totalQuantityReserved,

            TotalStockTransfers:
                await _db.StockTransfers.CountAsync(cancellationToken),
            PendingStockTransfers: pendingStockTransfers,
            ApprovedStockTransfers: approvedStockTransfers,
            DispatchedStockTransfers: dispatchedStockTransfers
        );
    }
}
