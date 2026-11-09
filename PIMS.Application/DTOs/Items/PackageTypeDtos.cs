
namespace PIMS.Application.DTOs.Items;

public sealed record PackageTypeDto(
    int Id,
    string Name,
    string Code,
    string? Description,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public sealed record CreatePackageTypeDto(
    string Name,
    string Code,
    string? Description);

public sealed record UpdatePackageTypeDto(
    string Name,
    string Code,
    string? Description,
    bool IsActive);
