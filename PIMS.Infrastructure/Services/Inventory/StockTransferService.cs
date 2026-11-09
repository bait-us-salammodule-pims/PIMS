
using Microsoft.EntityFrameworkCore;
using PIMS.Application.DTOs.Inventory;
using PIMS.Application.Interfaces.Inventory;
using PIMS.Domain.Entities;
using PIMS.Domain.Entities.Inventory;
using PIMS.Domain.Entities.Items;
using PIMS.Domain.Enums;
using PIMS.Infrastructure.Persistence;

namespace PIMS.Infrastructure.Services.Inventory;

public sealed class StockTransferService : IStockTransferService
{
    private readonly PimsDbContext _db;

    public StockTransferService(PimsDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<StockTransferResponseDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        var transfers = await TransferQuery()
            .OrderByDescending(x => x.Id)
            .ToListAsync(cancellationToken);

        return transfers.Select(MapTransfer).ToList();
    }

    public async Task<StockTransferResponseDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var transfer = await TransferQuery()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return transfer is null ? null : MapTransfer(transfer);
    }

    public async Task<StockTransferResponseDto> CreateAsync(
        CreateStockTransferDto request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (request.Items is null || request.Items.Count == 0)
            throw new ArgumentException(
                "At least one transfer item is required.");

        if (request.Items.Any(x =>
                x.ItemId <= 0 || x.RequestedQuantity <= 0))
        {
            throw new ArgumentException(
                "Every item must have a valid ID and quantity greater than zero.");
        }

        if (request.Items.GroupBy(x => x.ItemId).Any(g => g.Count() > 1))
            throw new ArgumentException(
                "Duplicate items are not allowed in a transfer.");

        if (request.SourceStoreId <= 0 || request.DestinationStoreId <= 0)
            throw new ArgumentException("Valid source and destination stores are required.");

        if (request.SourceStoreId == request.DestinationStoreId)
            throw new ArgumentException(
                "Source and destination stores must be different.");

        var sourceStore = await _db.Stores
            .FirstOrDefaultAsync(
                x => x.Id == request.SourceStoreId,
                cancellationToken)
            ?? throw new InvalidOperationException("Source store not found.");

        var destinationStore = await _db.Stores
            .FirstOrDefaultAsync(
                x => x.Id == request.DestinationStoreId,
                cancellationToken)
            ?? throw new InvalidOperationException("Destination store not found.");

        if (!sourceStore.IsActive || !destinationStore.IsActive)
            throw new InvalidOperationException(
                "Both stores must be active.");

        var itemIds = request.Items.Select(x => x.ItemId).ToList();

        var activeItemIds = await _db.Set<Item>()
            .Where(x => itemIds.Contains(x.Id) && x.IsActive)
            .Select(x => x.Id)
            .ToListAsync(cancellationToken);

        if (activeItemIds.Count != itemIds.Count)
            throw new InvalidOperationException(
                "One or more items do not exist or are inactive.");

        var transferNumber = await GenerateTransferNumberAsync(
            cancellationToken);

        var transfer = new StockTransfer(
            transferNumber,
            request.SourceStoreId,
            request.DestinationStoreId,
            request.RequestedBy,
            request.Notes);

        foreach (var item in request.Items)
        {
            transfer.AddItem(new StockTransferItem(
                item.ItemId,
                item.RequestedQuantity,
                item.Notes));
        }

        _db.Set<StockTransfer>().Add(transfer);

        await _db.SaveChangesAsync(cancellationToken);

        var created = await TransferQuery()
            .FirstAsync(x => x.Id == transfer.Id, cancellationToken);

        return MapTransfer(created);
    }

    public async Task<StockTransferResponseDto> SubmitAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var transfer = await GetTransferEntityAsync(id, cancellationToken);

        transfer.Submit();

        await _db.SaveChangesAsync(cancellationToken);

        return await GetRequiredResponseAsync(id, cancellationToken);
    }

    public async Task<StockTransferResponseDto> ApproveAsync(
        int id,
        string approvedBy,
        CancellationToken cancellationToken = default)
    {
        var transfer = await GetTransferEntityAsync(id, cancellationToken);

        transfer.Approve(approvedBy);

        await _db.SaveChangesAsync(cancellationToken);

        return await GetRequiredResponseAsync(id, cancellationToken);
    }

    public async Task<StockTransferResponseDto> RejectAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var transfer = await GetTransferEntityAsync(id, cancellationToken);

        transfer.Reject();

        await _db.SaveChangesAsync(cancellationToken);

        return await GetRequiredResponseAsync(id, cancellationToken);
    }

    public async Task<StockTransferResponseDto> DispatchAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        await using var transaction =
            await _db.Database.BeginTransactionAsync(cancellationToken);

        // Tracked query: entity changes will be persisted by SaveChangesAsync.
        var transfer = await _db.Set<StockTransfer>()
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new InvalidOperationException("Stock transfer not found.");

        if (transfer.Status != StockTransferStatus.Approved)
            throw new InvalidOperationException(
                "Only approved transfers can be dispatched.");

        foreach (var transferItem in transfer.Items)
        {
            var balance = await _db.InventoryBalances
                .FirstOrDefaultAsync(
                    x => x.StoreId == transfer.SourceStoreId
                        && x.ItemId == transferItem.ItemId,
                    cancellationToken)
                ?? throw new InvalidOperationException(
                    $"Source inventory balance not found for item {transferItem.ItemId}.");

            balance.RemoveStock(transferItem.RequestedQuantity);

            transferItem.RecordDispatch(transferItem.RequestedQuantity);

            _db.StockMovements.Add(new StockMovement(
                transfer.SourceStoreId,
                transferItem.ItemId,
                StockMovementType.TransferOut,
                transferItem.RequestedQuantity,
                "StockTransfer",
                $"{transfer.TransferNumber}-OUT-{transferItem.ItemId}",
                $"Transfer to store {transfer.DestinationStoreId}"));
        }

        transfer.MarkDispatched();

        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return await GetRequiredResponseAsync(id, cancellationToken);
    }

    public async Task<StockTransferResponseDto> ReceiveAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        await using var transaction =
            await _db.Database.BeginTransactionAsync(cancellationToken);

        // Tracked query: receipt and status changes will be persisted.
        var transfer = await _db.Set<StockTransfer>()
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new InvalidOperationException("Stock transfer not found.");

        if (transfer.Status != StockTransferStatus.Dispatched)
            throw new InvalidOperationException(
                "Only dispatched transfers can be received.");

        foreach (var transferItem in transfer.Items)
        {
            var quantityToReceive = transferItem.DispatchedQuantity
                - transferItem.ReceivedQuantity;

            if (quantityToReceive <= 0)
                throw new InvalidOperationException(
                    "No outstanding quantity remains to receive.");

            var balance = await _db.InventoryBalances
                .FirstOrDefaultAsync(
                    x => x.StoreId == transfer.DestinationStoreId
                        && x.ItemId == transferItem.ItemId,
                    cancellationToken);

            if (balance is null)
            {
                balance = new InventoryBalance(
                    transfer.DestinationStoreId,
                    transferItem.ItemId);

                _db.InventoryBalances.Add(balance);
            }

            balance.AddStock(quantityToReceive);

            transferItem.RecordReceipt(quantityToReceive);

            _db.StockMovements.Add(new StockMovement(
                transfer.DestinationStoreId,
                transferItem.ItemId,
                StockMovementType.TransferIn,
                quantityToReceive,
                "StockTransfer",
                $"{transfer.TransferNumber}-IN-{transferItem.ItemId}",
                $"Transfer received from store {transfer.SourceStoreId}"));
        }

        transfer.MarkReceived();

        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return await GetRequiredResponseAsync(id, cancellationToken);
    }

    public async Task<StockTransferResponseDto> CancelAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var transfer = await GetTransferEntityAsync(id, cancellationToken);

        transfer.Cancel();

        await _db.SaveChangesAsync(cancellationToken);

        return await GetRequiredResponseAsync(id, cancellationToken);
    }

    public async Task<StockTransferResponseDto> UpdateNotesAsync(
        int id,
        UpdateStockTransferNotesDto request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var transfer = await GetTransferEntityAsync(id, cancellationToken);

        transfer.UpdateNotes(request.Notes);

        await _db.SaveChangesAsync(cancellationToken);

        return await GetRequiredResponseAsync(id, cancellationToken);
    }

    private IQueryable<StockTransfer> TransferQuery()
    {
        return _db.Set<StockTransfer>()
            .AsNoTracking()
            .Include(x => x.Items)
                .ThenInclude(x => x.Item)
            .Include(x => x.SourceStore)
            .Include(x => x.DestinationStore);
    }

    private async Task<StockTransfer> GetTransferEntityAsync(
        int id,
        CancellationToken cancellationToken)
    {
        return await _db.Set<StockTransfer>()
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new InvalidOperationException("Stock transfer not found.");
    }

    private async Task<StockTransferResponseDto> GetRequiredResponseAsync(
        int id,
        CancellationToken cancellationToken)
    {
        var response = await GetByIdAsync(id, cancellationToken);

        return response
            ?? throw new InvalidOperationException("Stock transfer not found.");
    }

    private async Task<string> GenerateTransferNumberAsync(
        CancellationToken cancellationToken)
    {
        var prefix = $"TRF-{DateTime.UtcNow:yyyy}-";

        var lastNumber = await _db.Set<StockTransfer>()
            .Where(x => x.TransferNumber.StartsWith(prefix))
            .OrderByDescending(x => x.Id)
            .Select(x => x.TransferNumber)
            .FirstOrDefaultAsync(cancellationToken);

        var nextSequence = 1;

        if (lastNumber is not null)
        {
            var suffix = lastNumber[prefix.Length..];

            if (int.TryParse(suffix, out var sequence))
                nextSequence = sequence + 1;
        }

        return $"{prefix}{nextSequence:D4}";
    }

    private static StockTransferResponseDto MapTransfer(
        StockTransfer transfer)
    {
        var items = transfer.Items
            .Select(x => new StockTransferItemResponseDto(
                x.Id,
                x.ItemId,
                x.Item.ItemCode,
                x.Item.Name,
                x.RequestedQuantity,
                x.DispatchedQuantity,
                x.ReceivedQuantity,
                x.Notes))
            .ToList();

        return new StockTransferResponseDto(
            transfer.Id,
            transfer.TransferNumber,
            transfer.SourceStoreId,
            transfer.SourceStore.Name,
            transfer.DestinationStoreId,
            transfer.DestinationStore.Name,
            transfer.TransferDate,
            (int)transfer.Status,
            transfer.RequestedBy,
            transfer.ApprovedBy,
            transfer.ApprovedAt,
            transfer.DispatchedAt,
            transfer.ReceivedAt,
            transfer.Notes,
            items);
    }
}
