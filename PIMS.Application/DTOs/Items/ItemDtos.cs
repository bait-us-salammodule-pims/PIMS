
namespace PIMS.Application.DTOs.Items;

public sealed record ItemDto(
    int Id,
    string ItemCode,
    string Name,
    string? Description,
    string? Barcode,
    int CategoryId,
    string CategoryName,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public sealed record CreateItemDto(
    string ItemCode,
    string Name,
    string? Description,
    string? Barcode,
    int CategoryId);

public sealed record UpdateItemDto(
    string ItemCode,
    string Name,
    string? Description,
    string? Barcode,
    int CategoryId,
    bool IsActive);
