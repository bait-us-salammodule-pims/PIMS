using PIMS.Application.DTOs.Vendors;

namespace PIMS.Application.Interfaces.Vendors;

public interface IVendorContactService
{
    Task<IReadOnlyList<VendorContactDto>> GetAllAsync(
        int vendorId,
        CancellationToken cancellationToken = default);

    Task<VendorContactDto?> GetByIdAsync(
        int vendorId,
        int contactId,
        CancellationToken cancellationToken = default);

    Task<VendorContactDto?> CreateAsync(
        int vendorId,
        CreateVendorContactDto request,
        CancellationToken cancellationToken = default);

    Task<VendorContactDto?> UpdateAsync(
        int vendorId,
        int contactId,
        UpdateVendorContactDto request,
        CancellationToken cancellationToken = default);

    Task<bool> DeactivateAsync(
        int vendorId,
        int contactId,
        CancellationToken cancellationToken = default);

    Task<bool> ActivateAsync(
        int vendorId,
        int contactId,
        CancellationToken cancellationToken = default);
}