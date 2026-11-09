namespace PIMS.Application.DTOs.Items;

public sealed record ItemCategoryDto(
    int Id,
    string Name,
    string Code,
    string? Description,
    int? ParentCategoryId,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public sealed record CreateItemCategoryDto(
    string Name,
    string Code,
    string? Description,
    int? ParentCategoryId);

public sealed record UpdateItemCategoryDto(
    string Name,
    string Code,
    string? Description,
    bool IsActive,
    int? ParentCategoryId);