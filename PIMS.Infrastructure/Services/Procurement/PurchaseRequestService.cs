
using Microsoft.EntityFrameworkCore;
using PIMS.Application.DTOs.Procurement;
using PIMS.Application.Interfaces;
using PIMS.Application.Interfaces.Procurement;
using PIMS.Domain.Entities.Procurement;
using PIMS.Domain.Enums;
using PIMS.Infrastructure.Persistence;

namespace PIMS.Infrastructure.Services.Procurement;

public sealed class PurchaseRequestService : IPurchaseRequestService
{
    private readonly PimsDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;

    public PurchaseRequestService(
        PimsDbContext dbContext,
        ICurrentUserService currentUserService)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
    }

    public async Task<PurchaseRequestResponseDto> CreateAsync(
        CreatePurchaseRequestDto request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var authenticatedUserId = _currentUserService.UserId;

        if (!authenticatedUserId.HasValue || authenticatedUserId.Value <= 0)
        {
            throw new UnauthorizedAccessException(
                "Authenticated user could not be identified.");
        }

        var requestNumber = NormalizeRequestNumber(request.RequestNumber);
        var justification = NormalizeJustification(request.Justification);
        var requiredDate = NormalizeDate(request.RequiredDate);

        if (request.Items is null || request.Items.Count == 0)
            throw new ArgumentException(
                "At least one item is required.");

        var numberExists = await _dbContext.PurchaseRequests
            .AnyAsync(
                x => x.RequestNumber == requestNumber,
                cancellationToken);

        if (numberExists)
            throw new InvalidOperationException(
                "Purchase request number already exists.");

        await ValidateRequesterAndDepartmentAsync(
            authenticatedUserId.Value,
            request.DepartmentId,
            request.SubDepartmentId,
            cancellationToken);

        var itemIds = request.Items.Select(x => x.ItemId).ToList();

        if (itemIds.Any(x => x <= 0))
            throw new ArgumentException(
                "Item ID must be greater than zero.");

        if (itemIds.Distinct().Count() != itemIds.Count)
            throw new ArgumentException(
                "An item can only appear once in a purchase request.");

        foreach (var item in request.Items)
        {
            ValidateQuantity(item.Quantity);

            await ValidateItemAndUomAsync(
                item.ItemId,
                item.UnitOfMeasureId,
                cancellationToken);
        }

        var purchaseRequest = new PurchaseRequest(
            requestNumber,
            authenticatedUserId.Value,
            request.DepartmentId,
            requiredDate,
            justification,
            request.SubDepartmentId);

        foreach (var item in request.Items)
        {
            purchaseRequest.AddItem(
                new PurchaseRequestItem(
                    item.ItemId,
                    item.Quantity,
                    item.UnitOfMeasureId,
                    item.Remarks));
        }

        _dbContext.PurchaseRequests.Add(purchaseRequest);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(
            purchaseRequest.Id,
            cancellationToken);
    }

    public async Task<IReadOnlyList<PurchaseRequestResponseDto>>
        GetAllAsync(CancellationToken cancellationToken = default)
    {
        var requests = await QueryRequests()
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        return requests.Select(MapToDto).ToList();
    }

    public async Task<PurchaseRequestResponseDto> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        if (id <= 0)
            throw new ArgumentException(
                "Purchase request ID must be greater than zero.");

        var request = await QueryRequests()
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        if (request is null)
            throw new KeyNotFoundException(
                "Purchase request not found.");

        return MapToDto(request);
    }

    public async Task<PurchaseRequestResponseDto> UpdateAsync(
        int id,
        UpdatePurchaseRequestDto request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var entity = await _dbContext.PurchaseRequests
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        if (entity is null)
            throw new KeyNotFoundException(
                "Purchase request not found.");

        await ValidateRequesterAndDepartmentAsync(
            entity.RequestedByUserId,
            request.DepartmentId,
            request.SubDepartmentId,
            cancellationToken);

        entity.UpdateDetails(
            request.DepartmentId,
            NormalizeDate(request.RequiredDate),
            NormalizeJustification(request.Justification),
            request.SubDepartmentId);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<PurchaseRequestItemResponseDto> AddItemAsync(
        int requestId,
        CreatePurchaseRequestItemDto request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var entity = await _dbContext.PurchaseRequests
            .Include(x => x.Items)
            .FirstOrDefaultAsync(
                x => x.Id == requestId,
                cancellationToken);

        if (entity is null)
            throw new KeyNotFoundException(
                "Purchase request not found.");

        if (entity.Status != PurchaseRequestStatus.Draft)
            throw new InvalidOperationException(
                "Only draft requests can be modified.");

        ValidateQuantity(request.Quantity);

        if (entity.Items.Any(x => x.ItemId == request.ItemId))
            throw new InvalidOperationException(
                "This item already exists in the purchase request.");

        await ValidateItemAndUomAsync(
            request.ItemId,
            request.UnitOfMeasureId,
            cancellationToken);

        var newItem = new PurchaseRequestItem(
            request.ItemId,
            request.Quantity,
            request.UnitOfMeasureId,
            request.Remarks);

        entity.AddItem(newItem);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetItemResponseAsync(
            newItem.Id,
            cancellationToken);
    }

    public async Task<PurchaseRequestItemResponseDto> UpdateItemAsync(
        int requestId,
        int itemId,
        UpdatePurchaseRequestItemDto request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var entity = await _dbContext.PurchaseRequests
            .FirstOrDefaultAsync(
                x => x.Id == requestId,
                cancellationToken);

        if (entity is null)
            throw new KeyNotFoundException(
                "Purchase request not found.");

        if (entity.Status != PurchaseRequestStatus.Draft)
            throw new InvalidOperationException(
                "Only draft requests can be modified.");

        var item = await _dbContext.PurchaseRequestItems
            .FirstOrDefaultAsync(
                x => x.Id == itemId &&
                     x.PurchaseRequestId == requestId,
                cancellationToken);

        if (item is null)
            throw new KeyNotFoundException(
                "Purchase request item not found.");

        ValidateQuantity(request.Quantity);

        await ValidateItemAndUomAsync(
            item.ItemId,
            request.UnitOfMeasureId,
            cancellationToken);

        item.Update(
            request.Quantity,
            request.UnitOfMeasureId,
            request.Remarks);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetItemResponseAsync(
            item.Id,
            cancellationToken);
    }

    public async Task RemoveItemAsync(
        int requestId,
        int itemId,
        CancellationToken cancellationToken = default)
    {
        var entity = await _dbContext.PurchaseRequests
            .FirstOrDefaultAsync(
                x => x.Id == requestId,
                cancellationToken);

        if (entity is null)
            throw new KeyNotFoundException(
                "Purchase request not found.");

        if (entity.Status != PurchaseRequestStatus.Draft)
            throw new InvalidOperationException(
                "Only draft requests can be modified.");

        var item = await _dbContext.PurchaseRequestItems
            .FirstOrDefaultAsync(
                x => x.Id == itemId &&
                     x.PurchaseRequestId == requestId,
                cancellationToken);

        if (item is null)
            throw new KeyNotFoundException(
                "Purchase request item not found.");

        _dbContext.PurchaseRequestItems.Remove(item);
        entity.MarkUpdated();

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<PurchaseRequestResponseDto> SubmitAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var entity = await _dbContext.PurchaseRequests
            .Include(x => x.Items)
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        if (entity is null)
            throw new KeyNotFoundException(
                "Purchase request not found.");

        entity.Submit();

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<PurchaseRequestResponseDto> StartReviewAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var entity = await _dbContext.PurchaseRequests
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        if (entity is null)
            throw new KeyNotFoundException(
                "Purchase request not found.");

        entity.StartReview();

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<PurchaseRequestResponseDto> ApproveAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var entity = await _dbContext.PurchaseRequests
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        if (entity is null)
            throw new KeyNotFoundException(
                "Purchase request not found.");

        entity.Approve();

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<PurchaseRequestResponseDto> RejectAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var entity = await _dbContext.PurchaseRequests
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        if (entity is null)
            throw new KeyNotFoundException(
                "Purchase request not found.");

        entity.Reject();

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<PurchaseRequestResponseDto> CancelAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var entity = await _dbContext.PurchaseRequests
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        if (entity is null)
            throw new KeyNotFoundException(
                "Purchase request not found.");

        entity.Cancel();

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    private async Task ValidateRequesterAndDepartmentAsync(
        int requesterId,
        int departmentId,
        int? subDepartmentId,
        CancellationToken cancellationToken)
    {
        var requester = await _dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.Id == requesterId,
                cancellationToken);

        if (requester is null)
            throw new ArgumentException(
                "Requester was not found.");

        if (!requester.IsActive)
            throw new ArgumentException(
                "An inactive user cannot create a purchase request.");

        var department = await _dbContext.Departments
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.Id == departmentId,
                cancellationToken);

        if (department is null)
            throw new ArgumentException(
                "Department was not found.");

        if (!department.IsActive)
            throw new ArgumentException(
                "Cannot use an inactive department.");

        if (subDepartmentId.HasValue)
        {
            var subDepartment = await _dbContext.SubDepartments
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x => x.Id == subDepartmentId.Value,
                    cancellationToken);

            if (subDepartment is null)
                throw new ArgumentException(
                    "Sub-department was not found.");

            if (!subDepartment.IsActive)
                throw new ArgumentException(
                    "Cannot use an inactive sub-department.");

            if (subDepartment.DepartmentId != departmentId)
                throw new ArgumentException(
                    "Sub-department does not belong to the selected department.");
        }
    }

    private async Task ValidateItemAndUomAsync(
        int itemId,
        int? unitOfMeasureId,
        CancellationToken cancellationToken)
    {
        var item = await _dbContext.Items
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.Id == itemId,
                cancellationToken);

        if (item is null)
            throw new ArgumentException(
                "Item was not found.");

        if (!item.IsActive)
            throw new ArgumentException(
                "Cannot add an inactive item.");

        if (unitOfMeasureId.HasValue)
        {
            var uom = await _dbContext.UnitsOfMeasure
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x => x.Id == unitOfMeasureId.Value,
                    cancellationToken);

            if (uom is null)
                throw new ArgumentException(
                    "Unit of measure was not found.");

            if (!uom.IsActive)
                throw new ArgumentException(
                    "Cannot use an inactive unit of measure.");
        }
    }

    private async Task<PurchaseRequestItemResponseDto>
        GetItemResponseAsync(
            int itemId,
            CancellationToken cancellationToken)
    {
        var item = await _dbContext.PurchaseRequestItems
            .AsNoTracking()
            .Where(x => x.Id == itemId)
            .Select(x => new PurchaseRequestItemResponseDto(
                x.Id,
                x.ItemId,
                x.Item.ItemCode,
                x.Item.Name,
                x.Quantity,
                x.UnitOfMeasureId,
                x.UnitOfMeasure == null
                    ? null
                    : x.UnitOfMeasure.Name,
                x.Remarks))
            .FirstOrDefaultAsync(cancellationToken);

        if (item is null)
            throw new KeyNotFoundException(
                "Purchase request item not found.");

        return item;
    }

    private IQueryable<PurchaseRequest> QueryRequests()
    {
        return _dbContext.PurchaseRequests
            .Include(x => x.RequestedBy)
            .Include(x => x.Department)
            .Include(x => x.SubDepartment)
            .Include(x => x.Items)
                .ThenInclude(x => x.Item)
            .Include(x => x.Items)
                .ThenInclude(x => x.UnitOfMeasure);
    }

    private static PurchaseRequestResponseDto MapToDto(
        PurchaseRequest request)
    {
        return new PurchaseRequestResponseDto(
            request.Id,
            request.RequestNumber,
            request.RequestedByUserId,
            request.RequestedBy.FullName,
            request.DepartmentId,
            request.Department.Name,
            request.SubDepartmentId,
            request.SubDepartment?.Name,
            request.RequiredDate,
            request.Justification,
            request.Status,
            request.CreatedAt,
            request.UpdatedAt,
            request.Items
                .OrderBy(x => x.Id)
                .Select(x => new PurchaseRequestItemResponseDto(
                    x.Id,
                    x.ItemId,
                    x.Item.ItemCode,
                    x.Item.Name,
                    x.Quantity,
                    x.UnitOfMeasureId,
                    x.UnitOfMeasure?.Name,
                    x.Remarks))
                .ToList());
    }

    private static string NormalizeRequestNumber(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException(
                "Request number is required.");

        value = value.Trim().ToUpperInvariant();

        if (value.Length > 50)
            throw new ArgumentException(
                "Request number cannot exceed 50 characters.");

        return value;
    }

    private static string NormalizeJustification(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException(
                "Justification is required.");

        value = value.Trim();

        if (value.Length > 2000)
            throw new ArgumentException(
                "Justification cannot exceed 2000 characters.");

        return value;
    }

    private static DateTime NormalizeDate(DateTime value)
    {
        if (value == default)
            throw new ArgumentException(
                "Required date is required.");

        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };
    }

    private static void ValidateQuantity(decimal quantity)
    {
        if (quantity <= 0)
            throw new ArgumentException(
                "Quantity must be greater than zero.");

        if (quantity > 999999999999.999999m)
            throw new ArgumentException(
                "Quantity is too large.");
    }
}
