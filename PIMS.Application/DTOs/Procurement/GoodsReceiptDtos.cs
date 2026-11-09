
namespace PIMS.Application.DTOs.Procurement;

public sealed record CreateGoodsReceiptDto(
    int PurchaseOrderId,
    int StoreId,
    DateTime ReceiptDate,
    string? DeliveryChallanNumber,
    string? Notes,
    List<CreateGoodsReceiptItemDto> Items);

public sealed record CreateGoodsReceiptItemDto(
    int PurchaseOrderItemId,
    decimal ReceivedQuantity,
    decimal AcceptedQuantity,
    decimal RejectedQuantity,
    string? RejectionReason = null,
    string? Remarks = null);

public sealed record GoodsReceiptItemResponseDto(
    int Id,
    int PurchaseOrderItemId,
    int ItemId,
    string? ItemName,
    decimal OrderedQuantity,
    decimal PreviouslyReceivedQuantity,
    decimal ReceivedQuantity,
    decimal AcceptedQuantity,
    decimal RejectedQuantity,
    string? RejectionReason,
    string? Remarks);

public sealed record GoodsReceiptResponseDto(
    int Id,
    string ReceiptNumber,
    int PurchaseOrderId,
    string? PurchaseOrderNumber,
    int StoreId,
    DateTime ReceiptDate,
    string? DeliveryChallanNumber,
    string? Notes,
    int Status,
    DateTime CreatedAt,
    List<GoodsReceiptItemResponseDto> Items);
