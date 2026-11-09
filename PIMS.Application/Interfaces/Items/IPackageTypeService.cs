
using PIMS.Application.DTOs.Items;

namespace PIMS.Application.Interfaces.Items;

public interface IPackageTypeService
{
    Task<IReadOnlyList<PackageTypeDto>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<PackageTypeDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<PackageTypeDto> CreateAsync(
        CreatePackageTypeDto request,
        CancellationToken cancellationToken = default);

    Task<PackageTypeDto?> UpdateAsync(
        int id,
        UpdatePackageTypeDto request,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(
        int id,
        CancellationToken cancellationToken = default);
}
