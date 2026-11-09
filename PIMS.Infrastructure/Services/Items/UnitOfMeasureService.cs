
using Microsoft.EntityFrameworkCore;
using PIMS.Application.DTOs.Items;
using PIMS.Application.Interfaces.Items;
using PIMS.Domain.Entities.Items;
using PIMS.Infrastructure.Persistence;

namespace PIMS.Infrastructure.Services.Items;

public sealed class UnitOfMeasureService : IUnitOfMeasureService
{
    private readonly PimsDbContext _dbContext;

    public UnitOfMeasureService(PimsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<UnitOfMeasureDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.UnitsOfMeasure
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new UnitOfMeasureDto(
                x.Id,
                x.Name,
                x.Code,
                x.Description,
                x.IsActive,
                x.CreatedAt,
                x.UpdatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<UnitOfMeasureDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.UnitsOfMeasure
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new UnitOfMeasureDto(
                x.Id,
                x.Name,
                x.Code,
                x.Description,
                x.IsActive,
                x.CreatedAt,
                x.UpdatedAt))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<UnitOfMeasureDto> CreateAsync(
        CreateUnitOfMeasureDto request,
        CancellationToken cancellationToken = default)
    {
        var name = NormalizeRequired(request.Name, "Unit name");
        var code = NormalizeRequired(request.Code, "Unit code")
            .ToUpperInvariant();
        var description = NormalizeDescription(request.Description);

        var nameExists = await _dbContext.UnitsOfMeasure
            .AnyAsync(x => x.Name.ToLower() == name.ToLower(),
                cancellationToken);

        if (nameExists)
            throw new InvalidOperationException("Unit name already exists.");

        var codeExists = await _dbContext.UnitsOfMeasure
            .AnyAsync(x => x.Code == code, cancellationToken);

        if (codeExists)
            throw new InvalidOperationException("Unit code already exists.");

        var unit = new UnitOfMeasure(name, code, description);

        _dbContext.UnitsOfMeasure.Add(unit);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(unit);
    }

    public async Task<UnitOfMeasureDto?> UpdateAsync(
        int id,
        UpdateUnitOfMeasureDto request,
        CancellationToken cancellationToken = default)
    {
        var unit = await _dbContext.UnitsOfMeasure
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (unit is null)
            return null;

        var name = NormalizeRequired(request.Name, "Unit name");
        var code = NormalizeRequired(request.Code, "Unit code")
            .ToUpperInvariant();
        var description = NormalizeDescription(request.Description);

        var nameExists = await _dbContext.UnitsOfMeasure
            .AnyAsync(
                x => x.Id != id && x.Name.ToLower() == name.ToLower(),
                cancellationToken);

        if (nameExists)
            throw new InvalidOperationException("Unit name already exists.");

        var codeExists = await _dbContext.UnitsOfMeasure
            .AnyAsync(
                x => x.Id != id && x.Code == code,
                cancellationToken);

        if (codeExists)
            throw new InvalidOperationException("Unit code already exists.");

        unit.Update(name, code, description, request.IsActive);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(unit);
    }

    public async Task<bool> DeleteAsync(
       int id,
       CancellationToken cancellationToken = default)
    {
        var unit = await _dbContext.UnitsOfMeasure
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (unit is null)
            return false;

        unit.Deactivate();

        await _dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }

    private static string NormalizeRequired(string? value, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException($"{fieldName} is required.");

        value = value.Trim();

        if (fieldName == "Unit name" && value.Length > 100)
            throw new ArgumentException(
                "Unit name cannot exceed 100 characters.");

        if (fieldName == "Unit code" && value.Length > 20)
            throw new ArgumentException(
                "Unit code cannot exceed 20 characters.");

        return value;
    }

    private static string? NormalizeDescription(string? description)
    {
        if (string.IsNullOrWhiteSpace(description))
            return null;

        description = description.Trim();

        if (description.Length > 500)
            throw new ArgumentException(
                "Description cannot exceed 500 characters.");

        return description;
    }

    private static UnitOfMeasureDto ToDto(UnitOfMeasure unit)
    {
        return new UnitOfMeasureDto(
            unit.Id,
            unit.Name,
            unit.Code,
            unit.Description,
            unit.IsActive,
            unit.CreatedAt,
            unit.UpdatedAt);
    }
}
