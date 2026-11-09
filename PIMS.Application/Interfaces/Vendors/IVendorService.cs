
using PIMS.Application.DTOs.Vendors;

namespace PIMS.Application.Interfaces.Vendors;

public interface IVendorService
{
    Task<IReadOnlyList<VendorDto>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<VendorDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<VendorDto> CreateAsync(
        CreateVendorDto request,
        CancellationToken cancellationToken = default);

    Task<VendorDto?> UpdateAsync(
        int id,
        UpdateVendorDto request,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<bool> ActivateAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<bool> ApproveAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<bool> BlockAsync(
        int id,
        CancellationToken cancellationToken = default);
}
