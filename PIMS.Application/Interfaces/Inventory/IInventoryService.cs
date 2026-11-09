
using PIMS.Application.DTOs.Inventory;

namespace PIMS.Application.Interfaces.Inventory;

public interface IInventoryService
{
    Task<IReadOnlyList<InventoryBalanceResponseDto>> GetBalancesAsync(
        int? storeId = null,
        int? itemId = null,
        CancellationToken cancellationToken = default);

    Task<InventoryBalanceResponseDto?> GetBalanceAsync(
        int storeId,
        int itemId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StockMovementResponseDto>> GetMovementsAsync(
        int? storeId = null,
        int? itemId = null,
        CancellationToken cancellationToken = default);

    Task<StockMovementResponseDto> AdjustStockAsync(
        StockAdjustmentDto request,
        bool increase,
        CancellationToken cancellationToken = default);

    Task<InventoryBalanceResponseDto> ReserveStockAsync(
        StockReservationDto request,
        CancellationToken cancellationToken = default);

    Task<InventoryBalanceResponseDto> ReleaseReservationAsync(
        StockReservationDto request,
        CancellationToken cancellationToken = default);
}
