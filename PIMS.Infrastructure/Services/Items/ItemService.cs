using Microsoft.EntityFrameworkCore;
using PIMS.Application.DTOs.Items;
using PIMS.Application.Interfaces.Items;
using PIMS.Domain.Entities.Items;
using PIMS.Infrastructure.Persistence;

namespace PIMS.Infrastructure.Services.Items;

public sealed class ItemService : IItemService
{
    private readonly PimsDbContext _dbContext;

    public ItemService(PimsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ItemDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.Items
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new ItemDto(
                x.Id,
                x.ItemCode,
                x.Name,
                x.Description,
                x.Barcode,
                x.CategoryId,
                x.Category!.Name,
                x.IsActive,
                x.CreatedAt,
                x.UpdatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<ItemDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.Items
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new ItemDto(
                x.Id,
                x.ItemCode,
                x.Name,
                x.Description,
                x.Barcode,
                x.CategoryId,
                x.Category!.Name,
                x.IsActive,
                x.CreatedAt,
                x.UpdatedAt))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<ItemDto> CreateAsync(
        CreateItemDto request,
        CancellationToken cancellationToken = default)
    {
        var itemCode = NormalizeRequired(request.ItemCode, "Item code");
        var name = NormalizeRequired(request.Name, "Item name");
        var barcode = NormalizeBarcode(request.Barcode);

        var codeExists = await _dbContext.Items
            .AnyAsync(x => x.ItemCode == itemCode, cancellationToken);

        if (codeExists)
            throw new InvalidOperationException("Item code already exists.");

        if (barcode is not null)
        {
            var barcodeExists = await _dbContext.Items
                .AnyAsync(x => x.Barcode == barcode, cancellationToken);

            if (barcodeExists)
                throw new InvalidOperationException("Barcode already exists.");
        }

        var category = await _dbContext.ItemCategories
            .FirstOrDefaultAsync(
                x => x.Id == request.CategoryId,
                cancellationToken);

        if (category is null)
            throw new ArgumentException("Item category was not found.");

        if (!category.IsActive)
            throw new ArgumentException("Cannot assign an inactive category to an item.");

        var item = new Item(
            itemCode,
            name,
            request.CategoryId,
            request.Description,
            barcode);

        _dbContext.Items.Add(item);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(item, category.Name);
    }

    public async Task<ItemDto?> UpdateAsync(
        int id,
        UpdateItemDto request,
        CancellationToken cancellationToken = default)
    {
        var item = await _dbContext.Items
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (item is null)
            return null;

        var itemCode = NormalizeRequired(request.ItemCode, "Item code");
        var name = NormalizeRequired(request.Name, "Item name");
        var barcode = NormalizeBarcode(request.Barcode);

        var codeExists = await _dbContext.Items
            .AnyAsync(
                x => x.Id != id && x.ItemCode == itemCode,
                cancellationToken);

        if (codeExists)
            throw new InvalidOperationException("Item code already exists.");

        if (barcode is not null)
        {
            var barcodeExists = await _dbContext.Items
                .AnyAsync(
                    x => x.Id != id && x.Barcode == barcode,
                    cancellationToken);

            if (barcodeExists)
                throw new InvalidOperationException("Barcode already exists.");
        }

        var category = await _dbContext.ItemCategories
            .FirstOrDefaultAsync(
                x => x.Id == request.CategoryId,
                cancellationToken);

        if (category is null)
            throw new ArgumentException("Item category was not found.");

        if (!category.IsActive)
            throw new ArgumentException("Cannot assign an inactive category to an item.");

        item.Update(
            itemCode,
            name,
            request.CategoryId,
            request.Description,
            barcode,
            request.IsActive);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(item, category.Name);
    }

    public async Task<bool> DeleteAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var item = await _dbContext.Items
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (item is null)
            return false;

        _dbContext.Items.Remove(item);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }

    private static string NormalizeRequired(string? value, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException($"{fieldName} is required.");

        return value.Trim().ToUpperInvariant() switch
        {
            _ when fieldName == "Item name" =>
                NormalizeName(value),
            var normalized => normalized
        };
    }

    private static string NormalizeName(string value)
    {
        value = value.Trim();

        if (value.Length > 200)
            throw new ArgumentException("Item name cannot exceed 200 characters.");

        return value;
    }

    private static string? NormalizeBarcode(string? barcode)
    {
        if (string.IsNullOrWhiteSpace(barcode))
            return null;

        barcode = barcode.Trim();

        if (barcode.Length > 100)
            throw new ArgumentException("Barcode cannot exceed 100 characters.");

        return barcode;
    }

    private static ItemDto ToDto(Item item, string categoryName)
    {
        return new ItemDto(
            item.Id,
            item.ItemCode,
            item.Name,
            item.Description,
            item.Barcode,
            item.CategoryId,
            categoryName,
            item.IsActive,
            item.CreatedAt,
            item.UpdatedAt);
    }
}
