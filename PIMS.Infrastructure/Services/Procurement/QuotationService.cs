
using Microsoft.EntityFrameworkCore;
using PIMS.Application.DTOs.Procurement;
using PIMS.Application.Interfaces.Procurement;
using PIMS.Domain.Entities.Procurement;
using PIMS.Domain.Enums;
using PIMS.Infrastructure.Persistence;

namespace PIMS.Infrastructure.Services.Procurement;

public sealed class QuotationService : IQuotationService
{
    private readonly PimsDbContext _db;

    public QuotationService(PimsDbContext db)
    {
        _db = db;
    }

    public async Task<QuotationRequestResponseDto> CreateAsync(
        CreateQuotationRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var purchaseRequest = await _db.PurchaseRequests
            .FirstOrDefaultAsync(
                x => x.Id == request.PurchaseRequestId,
                cancellationToken);

        if (purchaseRequest is null)
            throw new InvalidOperationException("Purchase Request not found.");

        if (purchaseRequest.Status != PurchaseRequestStatus.Approved)
            throw new InvalidOperationException(
                "Only approved Purchase Requests can have quotation requests.");

        var number = request.QuotationNumber?.Trim().ToUpperInvariant();

        if (string.IsNullOrWhiteSpace(number))
            throw new ArgumentException("Quotation number is required.");

        if (await _db.QuotationRequests.AnyAsync(
            x => x.QuotationNumber == number, cancellationToken))
            throw new InvalidOperationException("Quotation number already exists.");

        var entity = new QuotationRequest(
            number,
            request.PurchaseRequestId,
            request.ClosingDate,
            request.Notes);

        _db.QuotationRequests.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(entity.Id, cancellationToken))!;
    }

    public async Task<List<QuotationRequestResponseDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        var entities = await Query()
            .OrderByDescending(x => x.Id)
            .ToListAsync(cancellationToken);

        return entities.Select(Map).ToList();
    }

    public async Task<QuotationRequestResponseDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var entity = await Query()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return entity is null ? null : Map(entity);
    }

    public async Task<QuotationRequestResponseDto> UpdateAsync(
        int id,
        UpdateQuotationRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var entity = await _db.QuotationRequests
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new InvalidOperationException("Quotation request not found.");

        entity.UpdateDetails(request.ClosingDate, request.Notes);

        await _db.SaveChangesAsync(cancellationToken);
        return (await GetByIdAsync(id, cancellationToken))!;
    }

    public async Task<QuotationRequestResponseDto> SendToVendorsAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var entity = await FindRequestAsync(id, cancellationToken);
        entity.MarkSentToVendors();

        await _db.SaveChangesAsync(cancellationToken);
        return (await GetByIdAsync(id, cancellationToken))!;
    }

    public async Task<VendorQuotationResponseDto> AddVendorQuotationAsync(
        int quotationRequestId,
        CreateVendorQuotationDto request,
        CancellationToken cancellationToken = default)
    {
        var quotationRequest = await _db.QuotationRequests
            .Include(x => x.PurchaseRequest)
                .ThenInclude(x => x.Items)
            .FirstOrDefaultAsync(
                x => x.Id == quotationRequestId,
                cancellationToken)
            ?? throw new InvalidOperationException("Quotation request not found.");

        if (quotationRequest.Status != QuotationStatus.SentToVendors)
            throw new InvalidOperationException(
                "Vendor quotations can only be added after the request is sent to vendors.");

        if (request.Items is null || request.Items.Count == 0)
            throw new InvalidOperationException(
                "At least one quotation item is required.");

        var vendor = await _db.Vendors
            .FirstOrDefaultAsync(
                x => x.Id == request.VendorId,
                cancellationToken)
            ?? throw new InvalidOperationException("Vendor not found.");

        if (!vendor.IsActive)
            throw new InvalidOperationException(
                "The vendor is inactive.");

        if (vendor.ApprovalStatus != VendorApprovalStatus.Approved)
            throw new InvalidOperationException(
                "Only approved vendors can submit quotations.");

        var requestedItems = quotationRequest.PurchaseRequest.Items
            .Select(x => x.Id)
            .ToHashSet();

        if (request.Items.Any(
            x => !requestedItems.Contains(x.PurchaseRequestItemId)))
            throw new InvalidOperationException(
                "Every quoted item must belong to the linked Purchase Request.");

        if (request.Items.Select(x => x.PurchaseRequestItemId).Distinct().Count()
            != request.Items.Count)
            throw new InvalidOperationException(
                "Duplicate Purchase Request items are not allowed in a quotation.");

        if (await _db.VendorQuotations.AnyAsync(
            x => x.QuotationRequestId == quotationRequestId
                 && x.VendorId == request.VendorId,
            cancellationToken))
            throw new InvalidOperationException(
                "This vendor has already submitted a quotation for this request.");

        var entity = new VendorQuotation(
            quotationRequestId,
            request.VendorId,
            request.VendorQuotationNumber,
            request.SubmittedAt,
            request.ValidUntil,
            request.Notes);

        foreach (var item in request.Items)
        {
            entity.Items.Add(new VendorQuotationItem(
                item.PurchaseRequestItemId,
                item.Quantity,
                item.UnitPrice,
                item.TaxPercentage,
                item.Remarks));
        }

        _db.VendorQuotations.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);

        return await GetVendorQuotationAsync(entity.Id, cancellationToken);
    }

    public async Task<QuotationRequestResponseDto> MarkResponsesReceivedAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var entity = await FindRequestAsync(id, cancellationToken);

        var hasResponses = await _db.VendorQuotations
            .AnyAsync(x => x.QuotationRequestId == id, cancellationToken);

        if (!hasResponses)
            throw new InvalidOperationException(
                "At least one vendor quotation is required.");

        entity.MarkResponsesReceived();

        await _db.SaveChangesAsync(cancellationToken);
        return (await GetByIdAsync(id, cancellationToken))!;
    }

    public async Task<QuotationRequestResponseDto> StartComparisonAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var entity = await FindRequestAsync(id, cancellationToken);
        entity.StartComparison();

        await _db.SaveChangesAsync(cancellationToken);
        return (await GetByIdAsync(id, cancellationToken))!;
    }

    public async Task<List<QuotationComparisonItemDto>> CompareAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        if (!await _db.QuotationRequests.AnyAsync(
            x => x.Id == id, cancellationToken))
            throw new InvalidOperationException("Quotation request not found.");

        var quotations = await _db.VendorQuotations
            .Include(x => x.Vendor)
            .Include(x => x.Items)
            .Where(x => x.QuotationRequestId == id)
            .OrderBy(x => x.Items.Sum(i => i.Quantity * i.UnitPrice))
            .ToListAsync(cancellationToken);

        return quotations.Select(x => new QuotationComparisonItemDto(
            x.Id,
            x.VendorId,
            x.Vendor.Name,
            x.VendorQuotationNumber,
            x.Items.Sum(i => i.LineTotal),
            x.IsSelected
        )).ToList();
    }

    public async Task<QuotationRequestResponseDto> SelectVendorQuotationAsync(
        int id,
        int vendorQuotationId,
        CancellationToken cancellationToken = default)
    {
        var request = await FindRequestAsync(id, cancellationToken);

        if (request.Status != QuotationStatus.UnderComparison)
            throw new InvalidOperationException(
                "Start quotation comparison before selecting a vendor.");

        var quotation = await _db.VendorQuotations
            .FirstOrDefaultAsync(
                x => x.Id == vendorQuotationId
                     && x.QuotationRequestId == id,
                cancellationToken)
            ?? throw new InvalidOperationException(
                "Vendor quotation not found for this request.");

        if (quotation.ValidUntil < DateTime.UtcNow)
            throw new InvalidOperationException(
                "This vendor quotation has expired.");

        quotation.Select();
        request.Award();

        await _db.SaveChangesAsync(cancellationToken);
        return (await GetByIdAsync(id, cancellationToken))!;
    }

    public async Task<QuotationRequestResponseDto> CancelAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var entity = await FindRequestAsync(id, cancellationToken);
        entity.Cancel();

        await _db.SaveChangesAsync(cancellationToken);
        return (await GetByIdAsync(id, cancellationToken))!;
    }

    private IQueryable<QuotationRequest> Query()
    {
        return _db.QuotationRequests
            .AsNoTracking()
            .Include(x => x.PurchaseRequest)
            .Include(x => x.VendorQuotations)
                .ThenInclude(x => x.Vendor)
            .Include(x => x.VendorQuotations)
                .ThenInclude(x => x.Items)
                    .ThenInclude(x => x.PurchaseRequestItem)
                        .ThenInclude(x => x.Item);
    }

    private async Task<QuotationRequest> FindRequestAsync(
        int id,
        CancellationToken cancellationToken)
    {
        return await _db.QuotationRequests
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new InvalidOperationException("Quotation request not found.");
    }

    private async Task<VendorQuotationResponseDto> GetVendorQuotationAsync(
        int id,
        CancellationToken cancellationToken)
    {
        var entity = await _db.VendorQuotations
            .AsNoTracking()
            .Include(x => x.Vendor)
            .Include(x => x.Items)
                .ThenInclude(x => x.PurchaseRequestItem)
                    .ThenInclude(x => x.Item)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new InvalidOperationException("Vendor quotation not found.");

        return MapVendorQuotation(entity);
    }

    private static QuotationRequestResponseDto Map(QuotationRequest entity)
    {
        return new QuotationRequestResponseDto(
            entity.Id,
            entity.QuotationNumber,
            entity.PurchaseRequestId,
            entity.PurchaseRequest.RequestNumber,
            entity.ClosingDate,
            entity.Notes,
            entity.Status,
            entity.CreatedAt,
            entity.UpdatedAt,
            entity.VendorQuotations.Select(MapVendorQuotation).ToList());
    }

    private static VendorQuotationResponseDto MapVendorQuotation(
        VendorQuotation entity)
    {
        var items = entity.Items.Select(x => new VendorQuotationItemResponseDto(
            x.Id,
            x.PurchaseRequestItemId,
            x.PurchaseRequestItem.ItemId,
            x.PurchaseRequestItem.Item.ItemCode,
            x.PurchaseRequestItem.Item.Name,
            x.Quantity,
            x.UnitPrice,
            x.TaxPercentage,
            x.LineTotal,
            x.Remarks)).ToList();

        return new VendorQuotationResponseDto(
            entity.Id,
            entity.QuotationRequestId,
            entity.VendorId,
            entity.Vendor.Name,
            entity.VendorQuotationNumber,
            entity.SubmittedAt,
            entity.ValidUntil,
            entity.Notes,
            entity.IsSelected,
            items.Sum(x => x.LineTotal),
            items);
    }
}