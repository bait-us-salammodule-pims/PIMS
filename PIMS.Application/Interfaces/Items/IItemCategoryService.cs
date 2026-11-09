using PIMS.Application.DTOs.Items;

namespace PIMS.Application.Interfaces.Items;

public interface IItemCategoryService
{
    Task<IReadOnlyList<ItemCategoryDto>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<ItemCategoryDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<ItemCategoryDto> CreateAsync(
        CreateItemCategoryDto request,
        CancellationToken cancellationToken = default);

    Task<ItemCategoryDto?> UpdateAsync(
        int id,
        UpdateItemCategoryDto request,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(
        int id,
        CancellationToken cancellationToken = default);
}