
using Microsoft.EntityFrameworkCore;
using PIMS.Application.DTOs.Items;
using PIMS.Infrastructure.Persistence;
using PIMS.Infrastructure.Services.Items;
using PIMS.Domain.Entities.Items;

namespace PIMS.Tests.Items;

public class ItemPricingServiceTests
{
    private static PimsDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<PimsDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new PimsDbContext(options);
    }

    private static async Task<int> SeedItemAsync(PimsDbContext db)
    {
        var item = new Item(
            "TEST-ITEM-001",
            "Test Item",
            1,
            "Item for automated tests",
            "TEST-BARCODE-001");

        db.Items.Add(item);
        await db.SaveChangesAsync();

        return item.Id;
    }

    private static CreateItemPricingDto CreateRequest(
        int itemId,
        decimal price = 100m,
        string currency = "PKR",
        DateTime? effectiveFrom = null,
        DateTime? effectiveTo = null)
    {
        return new CreateItemPricingDto(
            itemId,
            price,
            currency,
            effectiveFrom ?? new DateTime(
                2026, 10, 12, 0, 0, 0, DateTimeKind.Utc),
            effectiveTo);
    }

    [Fact]
    public async Task CreateAsync_WithValidRequest_ShouldCreatePricing()
    {
        using var db = CreateContext();
        var itemId = await SeedItemAsync(db);
        var service = new ItemPricingService(db);

        var result = await service.CreateAsync(
            CreateRequest(itemId, 125.50m));

        Assert.True(result.Id > 0);
        Assert.Equal(itemId, result.ItemId);
        Assert.Equal("TEST-ITEM-001", result.ItemCode);
        Assert.Equal("Test Item", result.ItemName);
        Assert.Equal(125.50m, result.UnitPrice);
        Assert.Equal("PKR", result.CurrencyCode);
        Assert.True(result.IsActive);
    }

    [Fact]
    public async Task CreateAsync_WithLowercaseCurrency_ShouldNormalizeCurrency()
    {
        using var db = CreateContext();
        var itemId = await SeedItemAsync(db);
        var service = new ItemPricingService(db);

        var result = await service.CreateAsync(
            CreateRequest(itemId, 100m, "pkr"));

        Assert.Equal("PKR", result.CurrencyCode);
    }

    
[Fact]
public async Task CreateAsync_WithUnknownItem_ShouldThrowArgumentException()
{
    using var db = CreateContext();
    var service = new ItemPricingService(db);

    var exception = await Assert.ThrowsAsync<ArgumentException>(
        () => service.CreateAsync(CreateRequest(99999)));

    Assert.Equal("The specified item does not exist.", exception.Message);
}


    [Fact]
    public async Task CreateAsync_WithOverlappingActivePricing_ShouldThrowInvalidOperationException()
    {
        using var db = CreateContext();
        var itemId = await SeedItemAsync(db);
        var service = new ItemPricingService(db);

        await service.CreateAsync(
            CreateRequest(itemId, 100m));

        var overlappingRequest = CreateRequest(
            itemId,
            200m,
            "PKR",
            new DateTime(2026, 10, 15, 0, 0, 0, DateTimeKind.Utc));

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CreateAsync(overlappingRequest));
    }

    [Fact]
    public async Task CreateAsync_WithDifferentCurrency_ShouldAllowOverlappingDates()
    {
        using var db = CreateContext();
        var itemId = await SeedItemAsync(db);
        var service = new ItemPricingService(db);

        await service.CreateAsync(
            CreateRequest(itemId, 100m, "PKR"));

        var usdRequest = CreateRequest(
            itemId,
            10m,
            "USD");

        var result = await service.CreateAsync(usdRequest);

        Assert.Equal("USD", result.CurrencyCode);
        Assert.Equal(10m, result.UnitPrice);
    }

    [Fact]
    public async Task GetAllAsync_ShouldReturnCreatedPricing()
    {
        using var db = CreateContext();
        var itemId = await SeedItemAsync(db);
        var service = new ItemPricingService(db);

        await service.CreateAsync(
            CreateRequest(itemId, 125.50m));

        var results = await service.GetAllAsync();

        Assert.Single(results);
        Assert.Equal(125.50m, results[0].UnitPrice);
        Assert.Equal(itemId, results[0].ItemId);
    }

    [Fact]
    public async Task GetAllAsync_WithItemId_ShouldFilterResults()
    {
        using var db = CreateContext();

        var firstItemId = await SeedItemAsync(db);

        var secondItem = new Item(
            "TEST-ITEM-002",
            "Second Test Item",
            1);

        db.Items.Add(secondItem);
        await db.SaveChangesAsync();

        var service = new ItemPricingService(db);

        await service.CreateAsync(CreateRequest(firstItemId));

        await service.CreateAsync(
            CreateRequest(
                secondItem.Id,
                200m,
                "PKR",
                new DateTime(
                    2026, 10, 13, 0, 0, 0, DateTimeKind.Utc)));

        var results = await service.GetAllAsync(firstItemId);

        Assert.Single(results);
        Assert.Equal(firstItemId, results[0].ItemId);
    }

    [Fact]
    public async Task GetByIdAsync_WithExistingPricing_ShouldReturnPricing()
    {
        using var db = CreateContext();
        var itemId = await SeedItemAsync(db);
        var service = new ItemPricingService(db);

        var created = await service.CreateAsync(
            CreateRequest(itemId, 150m));

        var result = await service.GetByIdAsync(created.Id);

        Assert.NotNull(result);
        Assert.Equal(created.Id, result.Id);
        Assert.Equal(150m, result.UnitPrice);
    }

    [Fact]
    public async Task GetByIdAsync_WithUnknownId_ShouldReturnNull()
    {
        using var db = CreateContext();
        var service = new ItemPricingService(db);

        var result = await service.GetByIdAsync(99999);

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateAsync_WithValidRequest_ShouldUpdatePricing()
    {
        using var db = CreateContext();
        var itemId = await SeedItemAsync(db);
        var service = new ItemPricingService(db);

        var created = await service.CreateAsync(
            CreateRequest(itemId, 100m));

        var updateRequest = new UpdateItemPricingDto(
            150.75m,
            "PKR",
            new DateTime(
                2026, 10, 13, 0, 0, 0, DateTimeKind.Utc),
            null,
            true);

        var result = await service.UpdateAsync(
            created.Id,
            updateRequest);

        Assert.NotNull(result);
        Assert.Equal(150.75m, result.UnitPrice);
        Assert.Equal(
            new DateTime(2026, 10, 13, 0, 0, 0, DateTimeKind.Utc),
            result.EffectiveFrom);
        Assert.True(result.IsActive);
    }

    [Fact]
    public async Task UpdateAsync_WithUnknownId_ShouldReturnNull()
    {
        using var db = CreateContext();
        var service = new ItemPricingService(db);

        var request = new UpdateItemPricingDto(
            100m,
            "PKR",
            new DateTime(
                2026, 10, 12, 0, 0, 0, DateTimeKind.Utc),
            null,
            true);

        var result = await service.UpdateAsync(99999, request);

        Assert.Null(result);
    }

    [Fact]
    public async Task DeleteAsync_WithExistingPricing_ShouldDeletePricing()
    {
        using var db = CreateContext();
        var itemId = await SeedItemAsync(db);
        var service = new ItemPricingService(db);

        var created = await service.CreateAsync(
            CreateRequest(itemId));

        var deleted = await service.DeleteAsync(created.Id);
        var result = await service.GetByIdAsync(created.Id);

        Assert.True(deleted);
        Assert.Null(result);
    }

    [Fact]
    public async Task DeleteAsync_WithUnknownId_ShouldReturnFalse()
    {
        using var db = CreateContext();
        var service = new ItemPricingService(db);

        var result = await service.DeleteAsync(99999);

        Assert.False(result);
    }

    
[Fact]
public async Task UpdateAsync_WhenDeactivatingOverlappingPricing_ShouldSucceed()
{
    using var db = CreateContext();
    var itemId = await SeedItemAsync(db);
    var service = new ItemPricingService(db);

    var first = await service.CreateAsync(
        CreateRequest(itemId, 100m));

    var second = await service.CreateAsync(
        CreateRequest(itemId, 200m, "USD"));

    // Deactivate the USD pricing.
    var result = await service.UpdateAsync(
        second.Id,
        new UpdateItemPricingDto(
            200m,
            "PKR",
            new DateTime(2026, 10, 12, 0, 0, 0, DateTimeKind.Utc),
            null,
            false));

    Assert.NotNull(result);
    Assert.False(result.IsActive);
    Assert.Equal(first.ItemId, result.ItemId);
}

[Fact]
public async Task UpdateAsync_WhenReactivatingOverlappingPricing_ShouldReject()
{
    using var db = CreateContext();
    var itemId = await SeedItemAsync(db);
    var service = new ItemPricingService(db);

    await service.CreateAsync(
        CreateRequest(itemId, 100m));

    var second = await service.CreateAsync(
        CreateRequest(itemId, 200m, "USD"));

    // Deactivate the second record first.
    await service.UpdateAsync(
        second.Id,
        new UpdateItemPricingDto(
            200m,
            "USD",
            new DateTime(2026, 10, 12, 0, 0, 0, DateTimeKind.Utc),
            null,
            false));

    // Reactivation in PKR overlaps the existing active PKR record.
    await Assert.ThrowsAsync<InvalidOperationException>(
        () => service.UpdateAsync(
            second.Id,
            new UpdateItemPricingDto(
                200m,
                "PKR",
                new DateTime(2026, 10, 12, 0, 0, 0, DateTimeKind.Utc),
                null,
                true)));
}

}
