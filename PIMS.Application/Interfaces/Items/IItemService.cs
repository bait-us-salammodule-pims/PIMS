using PIMS.Application.DTOs.Items;

namespace PIMS.Application.Interfaces.Items;

public interface IItemService
{
    Task<IReadOnlyList<ItemDto>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<ItemDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<ItemDto> CreateAsync(
        CreateItemDto request,
        CancellationToken cancellationToken = default);

    Task<ItemDto?> UpdateAsync(
        int id,
        UpdateItemDto request,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(
        int id,
        CancellationToken cancellationToken = default);
}
