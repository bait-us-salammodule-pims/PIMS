
namespace PIMS.Application.DTOs.Inventory;

public sealed record CreateStockTransferItemDto(
    int ItemId,
    decimal RequestedQuantity,
    string? Notes);

public sealed record CreateStockTransferDto(
    int SourceStoreId,
    int DestinationStoreId,
    string? RequestedBy,
    string? Notes,
    List<CreateStockTransferItemDto> Items);

public sealed record StockTransferItemResponseDto(
    int Id,
    int ItemId,
    string ItemCode,
    string ItemName,
    decimal RequestedQuantity,
    decimal DispatchedQuantity,
    decimal ReceivedQuantity,
    string? Notes);

public sealed record StockTransferResponseDto(
    int Id,
    string TransferNumber,
    int SourceStoreId,
    string SourceStoreName,
    int DestinationStoreId,
    string DestinationStoreName,
    DateTime TransferDate,
    int Status,
    string? RequestedBy,
    string? ApprovedBy,
    DateTime? ApprovedAt,
    DateTime? DispatchedAt,
    DateTime? ReceivedAt,
    string? Notes,
    IReadOnlyList<StockTransferItemResponseDto> Items);

public sealed record UpdateStockTransferNotesDto(
    string? Notes);
