
using Microsoft.EntityFrameworkCore;
using PIMS.Application.DTOs.Procurement;
using PIMS.Application.Interfaces.Procurement;
using PIMS.Domain.Entities.Procurement;
using PIMS.Domain.Enums;
using PIMS.Infrastructure.Persistence;

namespace PIMS.Infrastructure.Services.Procurement;

public sealed class PurchaseOrderService : IPurchaseOrderService
{
    private readonly PimsDbContext _db;

    public PurchaseOrderService(PimsDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<PurchaseOrderResponseDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        var orders = await Query()
            .OrderByDescending(x => x.Id)
            .ToListAsync(cancellationToken);

        return orders.Select(Map).ToList();
    }

    public async Task<PurchaseOrderResponseDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var order = await Query()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return order is null ? null : Map(order);
    }

    public async Task<PurchaseOrderResponseDto> CreateAsync(
        CreatePurchaseOrderDto request,
        CancellationToken cancellationToken = default)
    {
        if (request.Items is null || request.Items.Count == 0)
            throw new InvalidOperationException(
                "At least one purchase order item is required.");

        var quotation = await _db.VendorQuotations
            .Include(x => x.QuotationRequest)
                .ThenInclude(x => x.PurchaseRequest)
                    .ThenInclude(x => x.Items)
            .Include(x => x.Items)
            .FirstOrDefaultAsync(
                x => x.Id == request.VendorQuotationId
                     && x.QuotationRequestId == request.QuotationRequestId,
                cancellationToken)
            ?? throw new InvalidOperationException(
                "Vendor quotation not found for this quotation request.");

        if (quotation.QuotationRequest.Status != QuotationStatus.Awarded)
            throw new InvalidOperationException(
                "Purchase Orders can only be created from awarded quotations.");

        if (!quotation.IsSelected)
            throw new InvalidOperationException(
                "The vendor quotation has not been selected.");

        var purchaseRequest = quotation.QuotationRequest.PurchaseRequest;

        if (purchaseRequest.Status != PurchaseRequestStatus.Approved)
            throw new InvalidOperationException(
                "The linked Purchase Request is not approved.");

        if (request.Items.Select(x => x.PurchaseRequestItemId).Distinct().Count()
            != request.Items.Count)
            throw new InvalidOperationException(
                "Duplicate Purchase Request items are not allowed.");

        var requestItems = purchaseRequest.Items.ToDictionary(x => x.Id);
        var quotedItems = quotation.Items.ToDictionary(
            x => x.PurchaseRequestItemId);

        if (request.Items.Any(x =>
                !requestItems.ContainsKey(x.PurchaseRequestItemId)
                || !quotedItems.ContainsKey(x.PurchaseRequestItemId)))
            throw new InvalidOperationException(
                "Every order item must belong to both the Purchase Request and selected vendor quotation.");

        if (request.Items.Any(x => x.Quantity <= 0))
            throw new ArgumentException(
                "Item quantities must be greater than zero.");

        foreach (var requestedOrderItem in request.Items)
        {
            var requestItem = requestItems[requestedOrderItem.PurchaseRequestItemId];
            var quotedItem = quotedItems[requestedOrderItem.PurchaseRequestItemId];

            if (quotedItem.Quantity > requestItem.Quantity)
                throw new InvalidOperationException(
                    "The quoted quantity exceeds the approved requested quantity.");

            if (requestedOrderItem.Quantity != quotedItem.Quantity)
                throw new InvalidOperationException(
                    "Order quantity must match the selected vendor quotation quantity.");
        }

        var orderNumber =
            $"PO-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}";

        var order = new PurchaseOrder(
            orderNumber,
            purchaseRequest.Id,
            quotation.QuotationRequestId,
            quotation.Id,
            quotation.VendorId,
            request.OrderDate,
            request.ExpectedDeliveryDate,
            request.Notes);

        foreach (var requestedOrderItem in request.Items)
        {
            var quotedItem = quotedItems[requestedOrderItem.PurchaseRequestItemId];
            var requestItem = requestItems[requestedOrderItem.PurchaseRequestItemId];

            // Prices and tax are sourced from the selected quotation,
            // not trusted from the API request.
            order.AddItem(new PurchaseOrderItem(
                requestItem.Id,
                requestItem.ItemId,
                quotedItem.Quantity,
                quotedItem.UnitPrice,
                quotedItem.TaxPercentage,
                requestedOrderItem.Remarks));
        }

        _db.PurchaseOrders.Add(order);
        await _db.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(order.Id, cancellationToken))!;
    }

    public async Task<PurchaseOrderResponseDto> UpdateAsync(
        int id,
        UpdatePurchaseOrderDto request,
        CancellationToken cancellationToken = default)
    {
        var order = await _db.PurchaseOrders
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new InvalidOperationException("Purchase Order not found.");

        order.UpdateDetails(request.ExpectedDeliveryDate, request.Notes);

        await _db.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(id, cancellationToken))!;
    }

    public Task<PurchaseOrderResponseDto> SubmitForApprovalAsync(
        int id,
        CancellationToken cancellationToken = default)
        => ChangeStatusAsync(id, x => x.SubmitForApproval(), cancellationToken);

    public Task<PurchaseOrderResponseDto> ApproveAsync(
        int id,
        CancellationToken cancellationToken = default)
        => ChangeStatusAsync(id, x => x.Approve(), cancellationToken);

    public Task<PurchaseOrderResponseDto> IssueAsync(
        int id,
        CancellationToken cancellationToken = default)
        => ChangeStatusAsync(id, x => x.Issue(), cancellationToken);

    public Task<PurchaseOrderResponseDto> CancelAsync(
        int id,
        CancellationToken cancellationToken = default)
        => ChangeStatusAsync(id, x => x.Cancel(), cancellationToken);

    private async Task<PurchaseOrderResponseDto> ChangeStatusAsync(
        int id,
        Action<PurchaseOrder> change,
        CancellationToken cancellationToken)
    {
        var order = await _db.PurchaseOrders
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new InvalidOperationException("Purchase Order not found.");

        change(order);

        await _db.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(id, cancellationToken))!;
    }

    private IQueryable<PurchaseOrder> Query()
    {
        return _db.PurchaseOrders
            .AsNoTracking()
            .Include(x => x.Vendor)
            .Include(x => x.Items)
                .ThenInclude(x => x.PurchaseRequestItem)
                    .ThenInclude(x => x.Item);
    }

    private static PurchaseOrderResponseDto Map(PurchaseOrder order)
    {
        var items = order.Items.Select(x =>
            new PurchaseOrderItemResponseDto(
                x.Id,
                x.PurchaseRequestItemId,
                x.ItemId,
                x.PurchaseRequestItem.Item.Name,
                x.Quantity,
                x.UnitPrice,
                x.TaxPercentage,
                x.LineSubtotal,
                x.LineTax,
                x.LineTotal,
                x.Remarks)).ToList();

        var subtotal = items.Sum(x => x.LineSubtotal);
        var taxAmount = items.Sum(x => x.LineTax);

        return new PurchaseOrderResponseDto(
            order.Id,
            order.OrderNumber,
            order.PurchaseRequestId,
            order.QuotationRequestId,
            order.VendorQuotationId,
            order.VendorId,
            order.Vendor.Name,
            order.OrderDate,
            order.ExpectedDeliveryDate,
            order.Notes,
            (int)order.Status,
            subtotal,
            taxAmount,
            subtotal + taxAmount,
            order.CreatedAt,
            items);
    }
}
