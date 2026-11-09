
using PIMS.Domain.Enums;

namespace PIMS.Application.DTOs.Procurement;

public sealed record CreateQuotationRequestDto(
    string QuotationNumber,
    int PurchaseRequestId,
    DateTime ClosingDate,
    string? Notes);

public sealed record UpdateQuotationRequestDto(
    DateTime ClosingDate,
    string? Notes);

public sealed record CreateVendorQuotationItemDto(
    int PurchaseRequestItemId,
    decimal Quantity,
    decimal UnitPrice,
    decimal TaxPercentage,
    string? Remarks);

public sealed record CreateVendorQuotationDto(
    int VendorId,
    string VendorQuotationNumber,
    DateTime SubmittedAt,
    DateTime ValidUntil,
    string? Notes,
    List<CreateVendorQuotationItemDto> Items);

public sealed record UpdateVendorQuotationItemDto(
    decimal Quantity,
    decimal UnitPrice,
    decimal TaxPercentage,
    string? Remarks);

public sealed record VendorQuotationItemResponseDto(
    int Id,
    int PurchaseRequestItemId,
    int ItemId,
    string ItemCode,
    string ItemName,
    decimal Quantity,
    decimal UnitPrice,
    decimal TaxPercentage,
    decimal LineTotal,
    string? Remarks);

public sealed record VendorQuotationResponseDto(
    int Id,
    int QuotationRequestId,
    int VendorId,
    string VendorName,
    string VendorQuotationNumber,
    DateTime SubmittedAt,
    DateTime ValidUntil,
    string? Notes,
    bool IsSelected,
    decimal TotalAmount,
    List<VendorQuotationItemResponseDto> Items);

public sealed record QuotationRequestResponseDto(
    int Id,
    string QuotationNumber,
    int PurchaseRequestId,
    string PurchaseRequestNumber,
    DateTime ClosingDate,
    string? Notes,
    QuotationStatus Status,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    List<VendorQuotationResponseDto> VendorQuotations);

public sealed record QuotationComparisonItemDto(
    int VendorQuotationId,
    int VendorId,
    string VendorName,
    string VendorQuotationNumber,
    decimal TotalAmount,
    bool IsSelected);
