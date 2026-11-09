
using PIMS.Domain.Enums;

namespace PIMS.Application.DTOs.Procurement;

public sealed record CreatePurchaseRequestItemDto(
    int ItemId,
    decimal Quantity,
    int? UnitOfMeasureId,
    string? Remarks);

public sealed record CreatePurchaseRequestDto(
    string RequestNumber,
    int DepartmentId,
    int? SubDepartmentId,
    DateTime RequiredDate,
    string Justification,
    List<CreatePurchaseRequestItemDto> Items);

public sealed record UpdatePurchaseRequestDto(
    int DepartmentId,
    int? SubDepartmentId,
    DateTime RequiredDate,
    string Justification);

public sealed record UpdatePurchaseRequestItemDto(
    decimal Quantity,
    int? UnitOfMeasureId,
    string? Remarks);

public sealed record PurchaseRequestItemResponseDto(
    int Id,
    int ItemId,
    string ItemCode,
    string ItemName,
    decimal Quantity,
    int? UnitOfMeasureId,
    string? UnitOfMeasureName,
    string? Remarks);

public sealed record PurchaseRequestResponseDto(
    int Id,
    string RequestNumber,
    int RequestedByUserId,
    string RequestedByName,
    int DepartmentId,
    string DepartmentName,
    int? SubDepartmentId,
    string? SubDepartmentName,
    DateTime RequiredDate,
    string Justification,
    PurchaseRequestStatus Status,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    List<PurchaseRequestItemResponseDto> Items);
