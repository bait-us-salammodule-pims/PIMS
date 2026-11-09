using Microsoft.EntityFrameworkCore;
using PIMS.Application.DTOs.Procurement;
using PIMS.Application.Interfaces.Procurement;
using PIMS.Domain.Entities;
using PIMS.Domain.Entities.Inventory;
using PIMS.Domain.Entities.Procurement;
using PIMS.Domain.Enums;
using PIMS.Infrastructure.Persistence;

namespace PIMS.Infrastructure.Services.Procurement;

public sealed class GoodsReceiptService : IGoodsReceiptService
{
    private readonly PimsDbContext _db;

    public GoodsReceiptService(PimsDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<GoodsReceiptResponseDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        var receipts = await Query()
            .OrderByDescending(x => x.Id)
            .ToListAsync(cancellationToken);

        var result = new List<GoodsReceiptResponseDto>();

        foreach (var receipt in receipts)
            result.Add(await MapAsync(receipt, cancellationToken));

        return result;
    }

    public async Task<GoodsReceiptResponseDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var receipt = await Query()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return receipt is null
            ? null
            : await MapAsync(receipt, cancellationToken);
    }

    public async Task<GoodsReceiptResponseDto> CreateAsync(
        CreateGoodsReceiptDto request,
        CancellationToken cancellationToken = default)
    {
        if (request.Items is null || request.Items.Count == 0)
            throw new InvalidOperationException(
                "At least one goods receipt item is required.");

        if (request.Items.Select(x => x.PurchaseOrderItemId).Distinct().Count()
            != request.Items.Count)
            throw new InvalidOperationException(
                "Duplicate Purchase Order items are not allowed.");

        var store = await _db.Stores
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.Id == request.StoreId,
                cancellationToken)
            ?? throw new InvalidOperationException("Store not found.");

        if (!store.IsActive)
            throw new InvalidOperationException(
                "Goods cannot be received into an inactive store.");

        var order = await _db.PurchaseOrders
            .Include(x => x.Items)
            .FirstOrDefaultAsync(
                x => x.Id == request.PurchaseOrderId,
                cancellationToken)
            ?? throw new InvalidOperationException("Purchase Order not found.");

        if (order.Status != PurchaseOrderStatus.Issued &&
            order.Status != PurchaseOrderStatus.PartiallyReceived)
            throw new InvalidOperationException(
                "Goods can only be received against an issued or partially received Purchase Order.");

        var orderItems = order.Items.ToDictionary(x => x.Id);

        foreach (var input in request.Items)
        {
            if (!orderItems.TryGetValue(
                    input.PurchaseOrderItemId,
                    out var orderItem))
                throw new InvalidOperationException(
                    $"Purchase Order item {input.PurchaseOrderItemId} does not belong to this order.");

            if (input.ReceivedQuantity <= 0)
                throw new ArgumentException(
                    "Received quantity must be greater than zero.");

            if (input.AcceptedQuantity < 0 ||
                input.RejectedQuantity < 0 ||
                input.AcceptedQuantity + input.RejectedQuantity >
                input.ReceivedQuantity)
                throw new ArgumentException(
                    "Accepted and rejected quantities must be valid and cannot exceed received quantity.");

            var previouslyReceived = await _db.Set<GoodsReceipt>()
                .Where(x =>
                    x.PurchaseOrderId == order.Id &&
                    x.Status != GoodsReceiptStatus.Cancelled)
                .SelectMany(x => x.Items)
                .Where(x => x.PurchaseOrderItemId == orderItem.Id)
                .SumAsync(
                    x => (decimal?)x.ReceivedQuantity,
                    cancellationToken) ?? 0m;

            var remainingQuantity = orderItem.Quantity - previouslyReceived;

            if (input.ReceivedQuantity > remainingQuantity)
                throw new InvalidOperationException(
                    $"Received quantity exceeds the remaining quantity for Purchase Order item {orderItem.Id}. Remaining quantity: {Math.Max(0m, remainingQuantity)}.");
        }

        var receiptNumber =
            $"GRN-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}";

        var receipt = new GoodsReceipt(
            receiptNumber,
            order.Id,
            store.Id,
            request.ReceiptDate,
            request.DeliveryChallanNumber,
            request.Notes);

        foreach (var input in request.Items)
        {
            receipt.AddItem(new GoodsReceiptItem(
                input.PurchaseOrderItemId,
                input.ReceivedQuantity,
                input.AcceptedQuantity,
                input.RejectedQuantity,
                input.RejectionReason,
                input.Remarks));
        }

        _db.Set<GoodsReceipt>().Add(receipt);

        await _db.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(receipt.Id, cancellationToken))!;
    }

    public Task<GoodsReceiptResponseDto> SubmitAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        return ChangeAsync(
            id,
            receipt => receipt.Submit(),
            cancellationToken);
    }

    public Task<GoodsReceiptResponseDto> InspectAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        return ChangeAsync(
            id,
            receipt => receipt.Inspect(acceptAll: false),
            cancellationToken);
    }

    public async Task<GoodsReceiptResponseDto> RecordInspectionResultAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var receipt = await _db.Set<GoodsReceipt>()
            .Include(x => x.Items)
            .Include(x => x.PurchaseOrder)
                .ThenInclude(x => x.Items)
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken)
            ?? throw new InvalidOperationException("Goods Receipt not found.");

        if (receipt.Status != GoodsReceiptStatus.Inspected)
            throw new InvalidOperationException(
                "The receipt must be inspected before recording the inspection result.");

        var hasAccepted = receipt.Items.Any(x => x.AcceptedQuantity > 0);
        var hasRejected = receipt.Items.Any(x => x.RejectedQuantity > 0);

        receipt.RecordInspectionResult(hasAccepted, hasRejected);

        var finalizedStatuses = new[]
        {
            GoodsReceiptStatus.Accepted,
            GoodsReceiptStatus.PartiallyAccepted,
            GoodsReceiptStatus.Rejected
        };

        var receivedTotals = await _db.Set<GoodsReceipt>()
            .Where(x =>
                x.PurchaseOrderId == receipt.PurchaseOrderId &&
                x.Id != receipt.Id &&
                finalizedStatuses.Contains(x.Status))
            .SelectMany(x => x.Items)
            .GroupBy(x => x.PurchaseOrderItemId)
            .Select(group => new
            {
                PurchaseOrderItemId = group.Key,
                Quantity = group.Sum(x => x.AcceptedQuantity)
            })
            .ToListAsync(cancellationToken);

        var totalsByItem = receivedTotals.ToDictionary(
            x => x.PurchaseOrderItemId,
            x => x.Quantity);

        // Include the current receipt because its status is not saved yet.
        foreach (var item in receipt.Items)
        {
            if (totalsByItem.ContainsKey(item.PurchaseOrderItemId))
            {
                totalsByItem[item.PurchaseOrderItemId] += item.AcceptedQuantity;
            }
            else
            {
                totalsByItem[item.PurchaseOrderItemId] = item.AcceptedQuantity;
            }
        }

        var allItemsReceived = receipt.PurchaseOrder.Items.All(item =>
            totalsByItem.TryGetValue(item.Id, out var quantity) &&
            quantity >= item.Quantity);

        if (allItemsReceived)
            receipt.PurchaseOrder.MarkFullyReceived();
        else
            receipt.PurchaseOrder.MarkPartiallyReceived();

        await _db.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(id, cancellationToken))!;
    }

    public async Task<GoodsReceiptResponseDto> PostToInventoryAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        await using var transaction =
            await _db.Database.BeginTransactionAsync(cancellationToken);

        var receipt = await _db.Set<GoodsReceipt>()
            .Include(x => x.Items)
                .ThenInclude(x => x.PurchaseOrderItem)
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken)
            ?? throw new InvalidOperationException("Goods Receipt not found.");

        if (receipt.Status != GoodsReceiptStatus.Accepted &&
            receipt.Status != GoodsReceiptStatus.PartiallyAccepted)
            throw new InvalidOperationException(
                "Only accepted or partially accepted receipts can be posted to inventory.");

        var acceptedItems = receipt.Items
            .Where(x => x.AcceptedQuantity > 0)
            .ToList();

        if (acceptedItems.Count == 0)
            throw new InvalidOperationException(
                "No accepted quantities are available to post.");

        foreach (var item in acceptedItems)
        {
            var referenceNumber = $"{receipt.ReceiptNumber}:{item.Id}";

            var alreadyPosted = await _db.StockMovements.AnyAsync(
                x => x.ReferenceType == "GoodsReceipt" &&
                     x.ReferenceNumber == referenceNumber,
                cancellationToken);

            if (alreadyPosted)
                throw new InvalidOperationException(
                    "This Goods Receipt item has already been posted to inventory.");

            var itemId = item.PurchaseOrderItem.ItemId;

            var balance = await _db.InventoryBalances
                .FirstOrDefaultAsync(
                    x => x.StoreId == receipt.StoreId &&
                         x.ItemId == itemId,
                    cancellationToken);

            if (balance is null)
            {
                balance = new InventoryBalance(receipt.StoreId, itemId);
                _db.InventoryBalances.Add(balance);
            }

            balance.AddStock(item.AcceptedQuantity);

            _db.StockMovements.Add(new StockMovement(
                receipt.StoreId,
                itemId,
                StockMovementType.GoodsReceipt,
                item.AcceptedQuantity,
                "GoodsReceipt",
                referenceNumber,
                item.Remarks));
        }

        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return (await GetByIdAsync(id, cancellationToken))!;
    }


    public async Task<GoodsReceiptResponseDto> CancelAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var receipt = await _db.Set<GoodsReceipt>()
            .Include(x => x.Items)
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken)
            ?? throw new InvalidOperationException("Goods Receipt not found.");

        var receiptReferences = receipt.Items
            .Select(x => $"{receipt.ReceiptNumber}:{x.Id}")
            .ToList();

        var hasPostedStock = receiptReferences.Count > 0 &&
            await _db.StockMovements.AnyAsync(
                x => x.ReferenceType == "GoodsReceipt" &&
                     receiptReferences.Contains(x.ReferenceNumber),
                cancellationToken);

        if (hasPostedStock)
        {
            throw new InvalidOperationException(
                "This Goods Receipt has already been posted to inventory and cannot be cancelled. A stock reversal workflow is required.");
        }

        receipt.Cancel();

        await _db.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(id, cancellationToken))!;
    }



    private async Task<GoodsReceiptResponseDto> ChangeAsync(
        int id,
        Action<GoodsReceipt> change,
        CancellationToken cancellationToken)
    {
        var receipt = await _db.Set<GoodsReceipt>()
            .Include(x => x.Items)
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken)
            ?? throw new InvalidOperationException("Goods Receipt not found.");

        var receiptReferences = receipt.Items
            .Select(x => $"{receipt.ReceiptNumber}:{x.Id}")
            .ToList();

        var hasPostedStock = receiptReferences.Count > 0 &&
            await _db.StockMovements.AnyAsync(
                x => x.ReferenceType == "GoodsReceipt" &&
                     receiptReferences.Contains(x.ReferenceNumber),
                cancellationToken);

        if (hasPostedStock)
        {
            throw new InvalidOperationException(
                "This Goods Receipt has already been posted to inventory and its workflow cannot be changed.");
        }

        change(receipt);

        await _db.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(id, cancellationToken))!;
    }


    private IQueryable<GoodsReceipt> Query()
    {
        return _db.Set<GoodsReceipt>()
            .AsNoTracking()
            .Include(x => x.PurchaseOrder)
                .ThenInclude(x => x.Items)
            .Include(x => x.Items)
                .ThenInclude(x => x.PurchaseOrderItem)
                    .ThenInclude(x => x.PurchaseRequestItem)
                        .ThenInclude(x => x.Item);
    }

    private async Task<GoodsReceiptResponseDto> MapAsync(
        GoodsReceipt receipt,
        CancellationToken cancellationToken)
    {
        var items = new List<GoodsReceiptItemResponseDto>();

        foreach (var item in receipt.Items)
        {
            var previouslyReceived = await _db.Set<GoodsReceipt>()
                .Where(x =>
                    x.PurchaseOrderId == receipt.PurchaseOrderId &&
                    x.Id != receipt.Id &&
                    x.Status != GoodsReceiptStatus.Cancelled)
                .SelectMany(x => x.Items)
                .Where(x => x.PurchaseOrderItemId == item.PurchaseOrderItemId)
                .SumAsync(
                    x => (decimal?)x.ReceivedQuantity,
                    cancellationToken) ?? 0m;

            items.Add(new GoodsReceiptItemResponseDto(
                item.Id,
                item.PurchaseOrderItemId,
                item.PurchaseOrderItem.ItemId,
                item.PurchaseOrderItem.PurchaseRequestItem.Item.Name,
                item.PurchaseOrderItem.Quantity,
                previouslyReceived,
                item.ReceivedQuantity,
                item.AcceptedQuantity,
                item.RejectedQuantity,
                item.RejectionReason,
                item.Remarks));
        }

        return new GoodsReceiptResponseDto(
            receipt.Id,
            receipt.ReceiptNumber,
            receipt.PurchaseOrderId,
            receipt.PurchaseOrder.OrderNumber,
            receipt.StoreId,
            receipt.ReceiptDate,
            receipt.DeliveryChallanNumber,
            receipt.Notes,
            (int)receipt.Status,
            receipt.CreatedAt,
            items);
    }
}