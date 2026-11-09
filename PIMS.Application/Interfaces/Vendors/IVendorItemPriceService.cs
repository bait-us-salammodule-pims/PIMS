
using PIMS.Application.DTOs.Vendors;

namespace PIMS.Application.Interfaces.Vendors;

public interface IVendorItemPriceService
{
    Task<IReadOnlyList<VendorItemPriceDto>> GetAllAsync(
        int vendorId,
        CancellationToken cancellationToken = default);

    Task<VendorItemPriceDto?> GetByIdAsync(
        int vendorId,
        int priceId,
        CancellationToken cancellationToken = default);

    Task<VendorItemPriceDto?> CreateAsync(
        int vendorId,
        CreateVendorItemPriceDto request,
        CancellationToken cancellationToken = default);

    Task<VendorItemPriceDto?> UpdateAsync(
        int vendorId,
        int priceId,
        UpdateVendorItemPriceDto request,
        CancellationToken cancellationToken = default);

    Task<bool> DeactivateAsync(
        int vendorId,
        int priceId,
        CancellationToken cancellationToken = default);

    Task<bool> ActivateAsync(
        int vendorId,
        int priceId,
        CancellationToken cancellationToken = default);
}
