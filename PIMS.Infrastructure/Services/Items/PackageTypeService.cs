
using Microsoft.EntityFrameworkCore;
using PIMS.Application.DTOs.Items;
using PIMS.Application.Interfaces.Items;
using PIMS.Domain.Entities.Items;
using PIMS.Infrastructure.Persistence;

namespace PIMS.Infrastructure.Services.Items;

public sealed class PackageTypeService : IPackageTypeService
{
    private readonly PimsDbContext _dbContext;

    public PackageTypeService(PimsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<PackageTypeDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.PackageTypes
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => ToDto(x))
            .ToListAsync(cancellationToken);
    }

    public async Task<PackageTypeDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var packageType = await _dbContext.PackageTypes
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return packageType is null ? null : ToDto(packageType);
    }

    public async Task<PackageTypeDto> CreateAsync(
        CreatePackageTypeDto request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var name = NormalizeRequired(request.Name, "Package type name", 100);
        var code = NormalizeRequired(request.Code, "Package type code", 20)
            .ToUpperInvariant();
        var description = NormalizeDescription(request.Description);

        await EnsureUniqueAsync(name, code, null, cancellationToken);

        var packageType = new PackageType(name, code, description);

        _dbContext.PackageTypes.Add(packageType);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(packageType);
    }

    public async Task<PackageTypeDto?> UpdateAsync(
        int id,
        UpdatePackageTypeDto request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var packageType = await _dbContext.PackageTypes
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (packageType is null)
            return null;

        var name = NormalizeRequired(request.Name, "Package type name", 100);
        var code = NormalizeRequired(request.Code, "Package type code", 20)
            .ToUpperInvariant();
        var description = NormalizeDescription(request.Description);

        await EnsureUniqueAsync(name, code, id, cancellationToken);

        packageType.Update(name, code, description, request.IsActive);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(packageType);
    }

    public async Task<bool> DeleteAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var packageType = await _dbContext.PackageTypes
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (packageType is null)
            return false;

        _dbContext.PackageTypes.Remove(packageType);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }

    private async Task EnsureUniqueAsync(
        string name,
        string code,
        int? excludedId,
        CancellationToken cancellationToken)
    {
        var normalizedName = name.ToLowerInvariant();
        var normalizedCode = code.ToLowerInvariant();

        var nameExists = await _dbContext.PackageTypes.AnyAsync(
            x => x.Name.ToLower() == normalizedName
                 && (!excludedId.HasValue || x.Id != excludedId.Value),
            cancellationToken);

        if (nameExists)
            throw new InvalidOperationException(
                "Package type name already exists.");

        var codeExists = await _dbContext.PackageTypes.AnyAsync(
            x => x.Code.ToLower() == normalizedCode
                 && (!excludedId.HasValue || x.Id != excludedId.Value),
            cancellationToken);

        if (codeExists)
            throw new InvalidOperationException(
                "Package type code already exists.");
    }

    private static string NormalizeRequired(
        string? value,
        string fieldName,
        int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException($"{fieldName} is required.");

        value = value.Trim();

        if (value.Length > maxLength)
            throw new ArgumentException(
                $"{fieldName} cannot exceed {maxLength} characters.");

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

    private static PackageTypeDto ToDto(PackageType packageType)
    {
        return new PackageTypeDto(
            packageType.Id,
            packageType.Name,
            packageType.Code,
            packageType.Description,
            packageType.IsActive,
            packageType.CreatedAt,
            packageType.UpdatedAt);
    }
}
