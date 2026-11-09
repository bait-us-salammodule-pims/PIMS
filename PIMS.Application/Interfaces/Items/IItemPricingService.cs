
using PIMS.Application.DTOs.Items;

namespace PIMS.Application.Interfaces.Items;

public interface IItemPricingService
{
    Task<IReadOnlyList<ItemPricingDto>> GetAllAsync(
        int? itemId = null,
        CancellationToken cancellationToken = default);

    Task<ItemPricingDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<ItemPricingDto> CreateAsync(
        CreateItemPricingDto request,
        CancellationToken cancellationToken = default);

    Task<ItemPricingDto?> UpdateAsync(
        int id,
        UpdateItemPricingDto request,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(
        int id,
        CancellationToken cancellationToken = default);
}
