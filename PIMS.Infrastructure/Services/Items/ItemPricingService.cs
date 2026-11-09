
using Microsoft.EntityFrameworkCore;
using PIMS.Application.DTOs.Items;
using PIMS.Application.Interfaces.Items;
using PIMS.Domain.Entities.Items;
using PIMS.Infrastructure.Persistence;

namespace PIMS.Infrastructure.Services.Items;

public sealed class ItemPricingService : IItemPricingService
{
    private readonly PimsDbContext _dbContext;

    public ItemPricingService(PimsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ItemPricingDto>> GetAllAsync(
        int? itemId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.ItemPricings
            .AsNoTracking()
            .Include(x => x.Item)
            .AsQueryable();

        if (itemId.HasValue)
        {
            query = query.Where(x => x.ItemId == itemId.Value);
        }

        var records = await query
            .OrderBy(x => x.ItemId)
            .ThenByDescending(x => x.EffectiveFrom)
            .ToListAsync(cancellationToken);

        return records.Select(ToDto).ToList();
    }

    public async Task<ItemPricingDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var record = await _dbContext.ItemPricings
            .AsNoTracking()
            .Include(x => x.Item)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return record is null ? null : ToDto(record);
    }

    public async Task<ItemPricingDto> CreateAsync(
        CreateItemPricingDto request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var itemExists = await _dbContext.Items
            .AnyAsync(x => x.Id == request.ItemId, cancellationToken);

        if (!itemExists)
        {
            throw new ArgumentException(
                "The specified item does not exist.");
        }

        var currencyCode = NormalizeCurrencyCode(request.CurrencyCode);

        var pricing = new ItemPricing(
            request.ItemId,
            request.UnitPrice,
            currencyCode,
            request.EffectiveFrom,
            request.EffectiveTo);

        await EnsureNoOverlapAsync(
            request.ItemId,
            currencyCode,
            request.EffectiveFrom,
            request.EffectiveTo,
            null,
            cancellationToken);

        _dbContext.ItemPricings.Add(pricing);

        await _dbContext.SaveChangesAsync(cancellationToken);

        var created = await _dbContext.ItemPricings
            .AsNoTracking()
            .Include(x => x.Item)
            .FirstAsync(
                x => x.Id == pricing.Id,
                cancellationToken);

        return ToDto(created);
    }

    public async Task<ItemPricingDto?> UpdateAsync(
        int id,
        UpdateItemPricingDto request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var pricing = await _dbContext.ItemPricings
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        if (pricing is null)
        {
            return null;
        }

        var currencyCode = NormalizeCurrencyCode(
            request.CurrencyCode);

        // Only active pricing must be checked for overlap.
        // Reactivating a record must also pass this validation.
        if (request.IsActive)
        {
            await EnsureNoOverlapAsync(
                pricing.ItemId,
                currencyCode,
                request.EffectiveFrom,
                request.EffectiveTo,
                id,
                cancellationToken);
        }

        pricing.Update(
            request.UnitPrice,
            currencyCode,
            request.EffectiveFrom,
            request.EffectiveTo,
            request.IsActive);

        await _dbContext.SaveChangesAsync(cancellationToken);

        var updated = await _dbContext.ItemPricings
            .AsNoTracking()
            .Include(x => x.Item)
            .FirstAsync(
                x => x.Id == id,
                cancellationToken);

        return ToDto(updated);
    }

    public async Task<bool> DeleteAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var pricing = await _dbContext.ItemPricings
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        if (pricing is null)
        {
            return false;
        }

        _dbContext.ItemPricings.Remove(pricing);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }

    private async Task EnsureNoOverlapAsync(
        int itemId,
        string currencyCode,
        DateTime effectiveFrom,
        DateTime? effectiveTo,
        int? excludedId,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.ItemPricings
            .Where(x =>
                x.ItemId == itemId &&
                x.CurrencyCode == currencyCode &&
                x.IsActive &&
                (!excludedId.HasValue ||
                 x.Id != excludedId.Value));

        // Date intervals are inclusive.
        // A null EffectiveTo means the period has no end date.
        var overlaps = await query.AnyAsync(
            x =>
                (!x.EffectiveTo.HasValue ||
                 x.EffectiveTo.Value >= effectiveFrom) &&
                (!effectiveTo.HasValue ||
                 x.EffectiveFrom <= effectiveTo.Value),
            cancellationToken);

        if (overlaps)
        {
            throw new InvalidOperationException(
                "An active pricing period already overlaps this date range for the item and currency.");
        }
    }

    private static string NormalizeCurrencyCode(
        string? currencyCode)
    {
        if (string.IsNullOrWhiteSpace(currencyCode))
        {
            throw new ArgumentException(
                "Currency code is required.");
        }

        currencyCode = currencyCode
            .Trim()
            .ToUpperInvariant();

        if (currencyCode.Length != 3)
        {
            throw new ArgumentException(
                "Currency code must contain exactly 3 characters.");
        }

        return currencyCode;
    }

    private static ItemPricingDto ToDto(ItemPricing pricing)
    {
        return new ItemPricingDto(
            pricing.Id,
            pricing.ItemId,
            pricing.Item?.ItemCode ?? string.Empty,
            pricing.Item?.Name ?? string.Empty,
            pricing.UnitPrice,
            pricing.CurrencyCode,
            pricing.EffectiveFrom,
            pricing.EffectiveTo,
            pricing.IsActive,
            pricing.CreatedAt,
            pricing.UpdatedAt);
    }
}
