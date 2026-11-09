using Microsoft.EntityFrameworkCore;
using PIMS.Application.DTOs.Vendors;
using PIMS.Application.Interfaces.Vendors;
using PIMS.Domain.Entities;
using PIMS.Domain.Enums;
using PIMS.Infrastructure.Persistence;

namespace PIMS.Infrastructure.Services.Vendors;

public class VendorItemPriceService : IVendorItemPriceService
{
    private readonly PimsDbContext _context;

    public VendorItemPriceService(PimsDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<VendorItemPriceDto>> GetAllAsync(
        int vendorId,
        CancellationToken cancellationToken = default)
    {
        return await _context.VendorItemPrices
            .AsNoTracking()
            .Where(p => p.VendorId == vendorId)
            .OrderBy(p => p.ItemId)
            .Select(p => new VendorItemPriceDto
            {
                Id = p.Id,
                VendorId = p.VendorId,
                ItemId = p.ItemId,
                ItemName = p.Item.Name,
                ItemCode = p.Item.ItemCode,
                UnitPrice = p.UnitPrice,
                CurrencyCode = p.CurrencyCode,
                MinimumOrderQuantity = p.MinimumOrderQuantity,
                EffectiveFrom = p.EffectiveFrom,
                EffectiveTo = p.EffectiveTo,
                IsActive = p.IsActive,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<VendorItemPriceDto?> GetByIdAsync(
        int vendorId,
        int priceId,
        CancellationToken cancellationToken = default)
    {
        return await _context.VendorItemPrices
            .AsNoTracking()
            .Where(p => p.VendorId == vendorId && p.Id == priceId)
            .Select(p => new VendorItemPriceDto
            {
                Id = p.Id,
                VendorId = p.VendorId,
                ItemId = p.ItemId,
                ItemName = p.Item.Name,
                ItemCode = p.Item.ItemCode,
                UnitPrice = p.UnitPrice,
                CurrencyCode = p.CurrencyCode,
                MinimumOrderQuantity = p.MinimumOrderQuantity,
                EffectiveFrom = p.EffectiveFrom,
                EffectiveTo = p.EffectiveTo,
                IsActive = p.IsActive,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<VendorItemPriceDto?> CreateAsync(
        int vendorId,
        CreateVendorItemPriceDto request,
        CancellationToken cancellationToken = default)
    {
        var vendor = await _context.Vendors
            .FirstOrDefaultAsync(
                v => v.Id == vendorId,
                cancellationToken);

        if (vendor is null)
            return null;

        if (!vendor.IsActive)
            throw new InvalidOperationException(
                "Cannot create item pricing for an inactive vendor.");

        if (vendor.ApprovalStatus != VendorApprovalStatus.Approved)
            throw new InvalidOperationException(
                "Only approved vendors can have item pricing.");

        var itemExists = await _context.Items
            .AnyAsync(i => i.Id == request.ItemId, cancellationToken);

        if (!itemExists)
            throw new InvalidOperationException("Item not found.");

        var price = new VendorItemPrice(
            vendorId,
            request.ItemId,
            request.UnitPrice,
            request.CurrencyCode,
            request.MinimumOrderQuantity,
            request.EffectiveFrom,
            request.EffectiveTo);

        _context.VendorItemPrices.Add(price);
        await _context.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(vendorId, price.Id, cancellationToken);
    }

    public async Task<VendorItemPriceDto?> UpdateAsync(
        int vendorId,
        int priceId,
        UpdateVendorItemPriceDto request,
        CancellationToken cancellationToken = default)
    {
        var price = await _context.VendorItemPrices
            .FirstOrDefaultAsync(
                p => p.VendorId == vendorId && p.Id == priceId,
                cancellationToken);

        if (price is null)
            return null;

        var vendor = await _context.Vendors
            .FirstOrDefaultAsync(
                v => v.Id == vendorId,
                cancellationToken);

        if (vendor is null)
            return null;

        if (!vendor.IsActive)
            throw new InvalidOperationException(
                "Cannot update item pricing for an inactive vendor.");

        if (vendor.ApprovalStatus != VendorApprovalStatus.Approved)
            throw new InvalidOperationException(
                "Only approved vendors can have item pricing.");

        var itemExists = await _context.Items
            .AnyAsync(i => i.Id == request.ItemId, cancellationToken);

        if (!itemExists)
            throw new InvalidOperationException("Item not found.");

        if (price.ItemId != request.ItemId)
            throw new InvalidOperationException(
                "The item linked to a price record cannot be changed.");

        price.UpdateDetails(
            request.UnitPrice,
            request.CurrencyCode,
            request.MinimumOrderQuantity,
            request.EffectiveFrom,
            request.EffectiveTo);

        await _context.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(vendorId, priceId, cancellationToken);
    }

    public async Task<bool> DeactivateAsync(
        int vendorId,
        int priceId,
        CancellationToken cancellationToken = default)
    {
        var price = await _context.VendorItemPrices
            .FirstOrDefaultAsync(
                p => p.VendorId == vendorId && p.Id == priceId,
                cancellationToken);

        if (price is null)
            return false;

        price.Deactivate();
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> ActivateAsync(
        int vendorId,
        int priceId,
        CancellationToken cancellationToken = default)
    {
        var price = await _context.VendorItemPrices
            .FirstOrDefaultAsync(
                p => p.VendorId == vendorId && p.Id == priceId,
                cancellationToken);

        if (price is null)
            return false;

        price.Activate();
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}