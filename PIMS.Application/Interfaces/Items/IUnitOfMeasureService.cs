
using PIMS.Application.DTOs.Items;

namespace PIMS.Application.Interfaces.Items;

public interface IUnitOfMeasureService
{
    Task<IReadOnlyList<UnitOfMeasureDto>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<UnitOfMeasureDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<UnitOfMeasureDto> CreateAsync(
        CreateUnitOfMeasureDto request,
        CancellationToken cancellationToken = default);

    Task<UnitOfMeasureDto?> UpdateAsync(
        int id,
        UpdateUnitOfMeasureDto request,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(
        int id,
        CancellationToken cancellationToken = default);
}