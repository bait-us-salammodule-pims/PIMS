
namespace PIMS.Application.DTOs.Inventory;

public sealed record InventoryBalanceResponseDto(
    int Id,
    int StoreId,
    string StoreName,
    int ItemId,
    string ItemCode,
    string ItemName,
    decimal QuantityOnHand,
    decimal QuantityReserved,
    decimal AvailableQuantity);

public sealed record StockMovementResponseDto(
    int Id,
    int StoreId,
    string StoreName,
    int ItemId,
    string ItemCode,
    string ItemName,
    int MovementType,
    decimal Quantity,
    DateTime MovementDate,
    string ReferenceType,
    string ReferenceNumber,
    string? Notes);

public sealed record StockAdjustmentDto(
    int StoreId,
    int ItemId,
    decimal Quantity,
    string? ReferenceNumber,
    string? Notes);

public sealed record StockReservationDto(
    int StoreId,
    int ItemId,
    decimal Quantity);
