using Microsoft.EntityFrameworkCore;
using PIMS.Application.DTOs.Inventory;
using PIMS.Application.Interfaces.Inventory;
using PIMS.Domain.Entities.Inventory;
using PIMS.Domain.Entities.Items;
using PIMS.Domain.Enums;
using PIMS.Infrastructure.Persistence;

namespace PIMS.Infrastructure.Services.Inventory;

public sealed class InventoryService : IInventoryService
{
    private readonly PimsDbContext _db;

    public InventoryService(PimsDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<InventoryBalanceResponseDto>> GetBalancesAsync(
        int? storeId = null,
        int? itemId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _db.InventoryBalances
            .AsNoTracking()
            .Include(x => x.Store)
            .Include(x => x.Item)
            .AsQueryable();

        if (storeId.HasValue)
            query = query.Where(x => x.StoreId == storeId.Value);

        if (itemId.HasValue)
            query = query.Where(x => x.ItemId == itemId.Value);

        var balances = await query
            .OrderBy(x => x.StoreId)
            .ThenBy(x => x.ItemId)
            .ToListAsync(cancellationToken);

        return balances.Select(MapBalance).ToList();
    }

    public async Task<InventoryBalanceResponseDto?> GetBalanceAsync(
        int storeId,
        int itemId,
        CancellationToken cancellationToken = default)
    {
        var balance = await _db.InventoryBalances
            .AsNoTracking()
            .Include(x => x.Store)
            .Include(x => x.Item)
            .FirstOrDefaultAsync(
                x => x.StoreId == storeId && x.ItemId == itemId,
                cancellationToken);

        return balance is null ? null : MapBalance(balance);
    }

    public async Task<IReadOnlyList<StockMovementResponseDto>> GetMovementsAsync(
        int? storeId = null,
        int? itemId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _db.StockMovements
            .AsNoTracking()
            .Include(x => x.Store)
            .Include(x => x.Item)
            .AsQueryable();

        if (storeId.HasValue)
            query = query.Where(x => x.StoreId == storeId.Value);

        if (itemId.HasValue)
            query = query.Where(x => x.ItemId == itemId.Value);

        var movements = await query
            .OrderByDescending(x => x.MovementDate)
            .ThenByDescending(x => x.Id)
            .ToListAsync(cancellationToken);

        return movements.Select(MapMovement).ToList();
    }

    public async Task<StockMovementResponseDto> AdjustStockAsync(
        StockAdjustmentDto request,
        bool increase,
        CancellationToken cancellationToken = default)
    {
        ValidateQuantity(request.Quantity);

        var store = await _db.Stores
            .FirstOrDefaultAsync(
                x => x.Id == request.StoreId,
                cancellationToken)
            ?? throw new InvalidOperationException("Store not found.");

        if (!store.IsActive)
            throw new InvalidOperationException(
                "Cannot adjust stock in an inactive store.");

        var item = await _db.Set<Item>()
            .FirstOrDefaultAsync(
                x => x.Id == request.ItemId,
                cancellationToken)
            ?? throw new InvalidOperationException("Item not found.");

        if (!item.IsActive)
            throw new InvalidOperationException(
                "Cannot adjust stock for an inactive item.");

        var referenceNumber = string.IsNullOrWhiteSpace(request.ReferenceNumber)
            ? $"ADJ-{Guid.NewGuid():N}"
            : request.ReferenceNumber.Trim();

        var movementType = increase
            ? StockMovementType.AdjustmentIn
            : StockMovementType.AdjustmentOut;

        await using var transaction =
            await _db.Database.BeginTransactionAsync(cancellationToken);

        var duplicateReference = await _db.StockMovements
            .AnyAsync(
                x => x.ReferenceType == "StockAdjustment"
                    && x.ReferenceNumber == referenceNumber,
                cancellationToken);

        if (duplicateReference)
            throw new InvalidOperationException(
                "This stock adjustment reference number already exists.");

        var balance = await _db.InventoryBalances
            .FirstOrDefaultAsync(
                x => x.StoreId == request.StoreId
                    && x.ItemId == request.ItemId,
                cancellationToken);

        if (balance is null)
        {
            if (!increase)
                throw new InvalidOperationException(
                    "Insufficient available stock.");

            balance = new InventoryBalance(
                request.StoreId,
                request.ItemId);

            _db.InventoryBalances.Add(balance);
        }

        if (increase)
            balance.AddStock(request.Quantity);
        else
            balance.RemoveStock(request.Quantity);

        var movement = new StockMovement(
            request.StoreId,
            request.ItemId,
            movementType,
            request.Quantity,
            "StockAdjustment",
            referenceNumber,
            request.Notes);

        _db.StockMovements.Add(movement);

        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        await _db.Entry(movement)
            .Reference(x => x.Store)
            .LoadAsync(cancellationToken);

        await _db.Entry(movement)
            .Reference(x => x.Item)
            .LoadAsync(cancellationToken);

        return MapMovement(movement);
    }

    public async Task<InventoryBalanceResponseDto> ReserveStockAsync(
        StockReservationDto request,
        CancellationToken cancellationToken = default)
    {
        ValidateQuantity(request.Quantity);

        var balance = await _db.InventoryBalances
            .Include(x => x.Store)
            .Include(x => x.Item)
            .FirstOrDefaultAsync(
                x => x.StoreId == request.StoreId
                    && x.ItemId == request.ItemId,
                cancellationToken)
            ?? throw new InvalidOperationException(
                "Inventory balance not found.");

        balance.ReserveStock(request.Quantity);

        await _db.SaveChangesAsync(cancellationToken);

        return MapBalance(balance);
    }

    public async Task<InventoryBalanceResponseDto> ReleaseReservationAsync(
        StockReservationDto request,
        CancellationToken cancellationToken = default)
    {
        ValidateQuantity(request.Quantity);

        var balance = await _db.InventoryBalances
            .Include(x => x.Store)
            .Include(x => x.Item)
            .FirstOrDefaultAsync(
                x => x.StoreId == request.StoreId
                    && x.ItemId == request.ItemId,
                cancellationToken)
            ?? throw new InvalidOperationException(
                "Inventory balance not found.");

        balance.ReleaseReservation(request.Quantity);

        await _db.SaveChangesAsync(cancellationToken);

        return MapBalance(balance);
    }

    private static void ValidateQuantity(decimal quantity)
    {
        if (quantity <= 0)
            throw new ArgumentException(
                "Quantity must be greater than zero.");
    }

    private static InventoryBalanceResponseDto MapBalance(
        InventoryBalance balance)
    {
        return new InventoryBalanceResponseDto(
            balance.Id,
            balance.StoreId,
            balance.Store.Name,
            balance.ItemId,
            balance.Item.ItemCode,
            balance.Item.Name,
            balance.QuantityOnHand,
            balance.QuantityReserved,
            balance.AvailableQuantity);
    }

    private static StockMovementResponseDto MapMovement(
        StockMovement movement)
    {
        return new StockMovementResponseDto(
            movement.Id,
            movement.StoreId,
            movement.Store.Name,
            movement.ItemId,
            movement.Item.ItemCode,
            movement.Item.Name,
            (int)movement.MovementType,
            movement.Quantity,
            movement.MovementDate,
            movement.ReferenceType,
            movement.ReferenceNumber,
            movement.Notes);
    }
}