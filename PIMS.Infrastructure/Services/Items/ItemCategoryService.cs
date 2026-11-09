using Microsoft.EntityFrameworkCore;
using PIMS.Application.DTOs.Items;
using PIMS.Application.Interfaces.Items;
using PIMS.Domain.Entities.Items;
using PIMS.Infrastructure.Persistence;

namespace PIMS.Infrastructure.Services.Items;

public sealed class ItemCategoryService : IItemCategoryService
{
    private readonly PimsDbContext _dbContext;

    public ItemCategoryService(PimsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ItemCategoryDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.ItemCategories
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new ItemCategoryDto(
                x.Id,
                x.Name,
                x.Code,
                x.Description,
                x.ParentCategoryId,
                x.IsActive,
                x.CreatedAt,
                x.UpdatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<ItemCategoryDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.ItemCategories
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new ItemCategoryDto(
                x.Id,
                x.Name,
                x.Code,
                x.Description,
                x.ParentCategoryId,
                x.IsActive,
                x.CreatedAt,
                x.UpdatedAt))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<ItemCategoryDto> CreateAsync(
        CreateItemCategoryDto request,
        CancellationToken cancellationToken = default)
    {
        var code = request.Code?.Trim().ToUpperInvariant();

        if (string.IsNullOrWhiteSpace(request.Name))
            throw new ArgumentException("Category name is required.");

        if (string.IsNullOrWhiteSpace(code))
            throw new ArgumentException("Category code is required.");

        var codeExists = await _dbContext.ItemCategories
            .AnyAsync(x => x.Code == code, cancellationToken);

        if (codeExists)
            throw new InvalidOperationException("Category code already exists.");

        if (request.ParentCategoryId.HasValue)
        {
            var parentExists = await _dbContext.ItemCategories
                .AnyAsync(
                    x => x.Id == request.ParentCategoryId.Value,
                    cancellationToken);

            if (!parentExists)
                throw new ArgumentException("Parent category was not found.");
        }

        var category = new ItemCategory(
            request.Name,
            code,
            request.Description,
            request.ParentCategoryId);

        _dbContext.ItemCategories.Add(category);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(category);
    }

    public async Task<ItemCategoryDto?> UpdateAsync(
        int id,
        UpdateItemCategoryDto request,
        CancellationToken cancellationToken = default)
    {
        var category = await _dbContext.ItemCategories
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (category is null)
            return null;

        var code = request.Code?.Trim().ToUpperInvariant();

        if (string.IsNullOrWhiteSpace(request.Name))
            throw new ArgumentException("Category name is required.");

        if (string.IsNullOrWhiteSpace(code))
            throw new ArgumentException("Category code is required.");

        var duplicateCode = await _dbContext.ItemCategories
            .AnyAsync(
                x => x.Id != id && x.Code == code,
                cancellationToken);

        if (duplicateCode)
            throw new InvalidOperationException("Category code already exists.");

        if (request.ParentCategoryId == id)
            throw new ArgumentException("A category cannot be its own parent.");

        if (request.ParentCategoryId.HasValue)
        {
            var parentExists = await _dbContext.ItemCategories
                .AnyAsync(
                    x => x.Id == request.ParentCategoryId.Value,
                    cancellationToken);

            if (!parentExists)
                throw new ArgumentException("Parent category was not found.");
        }

        category.Update(
            request.Name,
            code,
            request.Description,
            request.IsActive);

        category.SetParentCategory(request.ParentCategoryId);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(category);
    }

    public async Task<bool> DeleteAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var category = await _dbContext.ItemCategories
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (category is null)
            return false;

        var hasSubCategories = await _dbContext.ItemCategories
            .AnyAsync(
                x => x.ParentCategoryId == id,
                cancellationToken);

        if (hasSubCategories)
        {
            throw new InvalidOperationException(
                "Cannot delete a category that has subcategories.");
        }

        _dbContext.ItemCategories.Remove(category);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }

    private static ItemCategoryDto ToDto(ItemCategory category)
    {
        return new ItemCategoryDto(
            category.Id,
            category.Name,
            category.Code,
            category.Description,
            category.ParentCategoryId,
            category.IsActive,
            category.CreatedAt,
            category.UpdatedAt);
    }
}