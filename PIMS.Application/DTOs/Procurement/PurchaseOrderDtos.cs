
namespace PIMS.Application.DTOs.Procurement;

public sealed record CreatePurchaseOrderDto(
    int QuotationRequestId,
    int VendorQuotationId,
    DateTime OrderDate,
    DateTime ExpectedDeliveryDate,
    string? Notes,
    List<CreatePurchaseOrderItemDto> Items);

public sealed record CreatePurchaseOrderItemDto(
    int PurchaseRequestItemId,
    decimal Quantity,
    decimal UnitPrice,
    decimal TaxPercentage = 0,
    string? Remarks = null);

public sealed record UpdatePurchaseOrderDto(
    DateTime ExpectedDeliveryDate,
    string? Notes);

public sealed record PurchaseOrderItemResponseDto(
    int Id,
    int PurchaseRequestItemId,
    int ItemId,
    string? ItemName,
    decimal Quantity,
    decimal UnitPrice,
    decimal TaxPercentage,
    decimal LineSubtotal,
    decimal LineTax,
    decimal LineTotal,
    string? Remarks);

public sealed record PurchaseOrderResponseDto(
    int Id,
    string OrderNumber,
    int PurchaseRequestId,
    int QuotationRequestId,
    int VendorQuotationId,
    int VendorId,
    string? VendorName,
    DateTime OrderDate,
    DateTime ExpectedDeliveryDate,
    string? Notes,
    int Status,
    decimal Subtotal,
    decimal TaxAmount,
    decimal TotalAmount,
    DateTime CreatedAt,
    List<PurchaseOrderItemResponseDto> Items);
