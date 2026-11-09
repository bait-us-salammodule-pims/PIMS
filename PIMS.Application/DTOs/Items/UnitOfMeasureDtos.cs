
namespace PIMS.Application.DTOs.Items;

public sealed record UnitOfMeasureDto(
    int Id,
    string Name,
    string Code,
    string? Description,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public sealed record CreateUnitOfMeasureDto(
    string Name,
    string Code,
    string? Description);

public sealed record UpdateUnitOfMeasureDto(
    string Name,
    string Code,
    string? Description,
    bool IsActive);