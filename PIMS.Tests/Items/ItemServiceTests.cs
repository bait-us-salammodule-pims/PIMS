using Microsoft.EntityFrameworkCore;
using PIMS.Application.DTOs.Items;
using PIMS.Domain.Entities.Items;
using PIMS.Infrastructure.Persistence;
using PIMS.Infrastructure.Services.Items;
using Xunit;

namespace PIMS.Tests.Items;

public sealed class ItemServiceTests
{
    private static PimsDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<PimsDbContext>()
            .UseInMemoryDatabase($"ItemTests_{Guid.NewGuid()}")
            .Options;

        return new PimsDbContext(options);
    }

    private static async Task<ItemCategory> CreateCategoryAsync(
        PimsDbContext db,
        string name = "Medical Supplies",
        string code = "MED-SUP",
        bool isActive = true)
    {
        var category = new ItemCategory(name, code);

        if (!isActive)
            category.Update(name, code, null, false);

        db.ItemCategories.Add(category);
        await db.SaveChangesAsync();

        return category;
    }

    private static CreateItemDto CreateRequest(
        int categoryId,
        string itemCode = "MED-ITEM-001",
        string name = "Surgical Gloves",
        string? description = "Disposable examination gloves",
        string? barcode = "8901234567890")
    {
        return new CreateItemDto(
            itemCode,
            name,
            description,
            barcode,
            categoryId);
    }

    private static UpdateItemDto UpdateRequest(
        int categoryId,
        string itemCode = "MED-ITEM-UPDATED",
        string name = "Updated Gloves",
        string? description = "Updated description",
        string? barcode = "UPDATED-123",
        bool isActive = true)
    {
        return new UpdateItemDto(
            itemCode,
            name,
            description,
            barcode,
            categoryId,
            isActive);
    }

    [Fact]
    public async Task CreateAsync_WithValidRequest_CreatesItem()
    {
        using var db = CreateDbContext();
        var category = await CreateCategoryAsync(db);
        var service = new ItemService(db);

        var result = await service.CreateAsync(CreateRequest(category.Id));

        Assert.True(result.Id > 0);
        Assert.Equal("MED-ITEM-001", result.ItemCode);
        Assert.Equal("Surgical Gloves", result.Name);
        Assert.Equal(category.Id, result.CategoryId);
        Assert.Equal(category.Name, result.CategoryName);
        Assert.Equal("8901234567890", result.Barcode);
        Assert.True(result.IsActive);
    }

    [Fact]
    public async Task CreateAsync_NormalizesItemCodeAndName()
    {
        using var db = CreateDbContext();
        var category = await CreateCategoryAsync(db);
        var service = new ItemService(db);

        var result = await service.CreateAsync(
            CreateRequest(
                category.Id,
                itemCode: "  med-item-002  ",
                name: "  Examination Gloves  "));

        Assert.Equal("MED-ITEM-002", result.ItemCode);
        Assert.Equal("Examination Gloves", result.Name);
    }

    [Fact]
    public async Task CreateAsync_WithDuplicateItemCode_ThrowsInvalidOperationException()
    {
        using var db = CreateDbContext();
        var category = await CreateCategoryAsync(db);
        var service = new ItemService(db);

        await service.CreateAsync(CreateRequest(category.Id));

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CreateAsync(
                CreateRequest(
                    category.Id,
                    itemCode: "MED-ITEM-001",
                    barcode: "OTHER-BARCODE")));

        Assert.Equal("Item code already exists.", exception.Message);
    }

    [Fact]
    public async Task CreateAsync_WithDuplicateBarcode_ThrowsInvalidOperationException()
    {
        using var db = CreateDbContext();
        var category = await CreateCategoryAsync(db);
        var service = new ItemService(db);

        await service.CreateAsync(CreateRequest(category.Id));

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CreateAsync(
                CreateRequest(
                    category.Id,
                    itemCode: "MED-ITEM-002",
                    barcode: "8901234567890")));

        Assert.Equal("Barcode already exists.", exception.Message);
    }

    [Fact]
    public async Task CreateAsync_WithUnknownCategory_ThrowsArgumentException()
    {
        using var db = CreateDbContext();
        var service = new ItemService(db);

        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => service.CreateAsync(CreateRequest(999)));

        Assert.Equal("Item category was not found.", exception.Message);
    }

    [Fact]
    public async Task CreateAsync_WithInactiveCategory_ThrowsArgumentException()
    {
        using var db = CreateDbContext();
        var category = await CreateCategoryAsync(
            db,
            isActive: false);
        var service = new ItemService(db);

        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => service.CreateAsync(CreateRequest(category.Id)));

        Assert.Equal(
            "Cannot assign an inactive category to an item.",
            exception.Message);
    }

    [Fact]
    public async Task CreateAsync_WithBlankItemCode_ThrowsArgumentException()
    {
        using var db = CreateDbContext();
        var category = await CreateCategoryAsync(db);
        var service = new ItemService(db);

        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => service.CreateAsync(
                CreateRequest(category.Id, itemCode: " ")));

        Assert.Equal("Item code is required.", exception.Message);
    }

    [Fact]
    public async Task CreateAsync_WithBlankName_ThrowsArgumentException()
    {
        using var db = CreateDbContext();
        var category = await CreateCategoryAsync(db);
        var service = new ItemService(db);

        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => service.CreateAsync(
                CreateRequest(category.Id, name: " ")));

        Assert.Equal("Item name is required.", exception.Message);
    }

    [Fact]
    public async Task CreateAsync_WithBlankBarcode_StoresNullBarcode()
    {
        using var db = CreateDbContext();
        var category = await CreateCategoryAsync(db);
        var service = new ItemService(db);

        var result = await service.CreateAsync(
            CreateRequest(category.Id, barcode: "  "));

        Assert.Null(result.Barcode);
    }

    [Fact]
    public async Task GetByIdAsync_WhenItemExists_ReturnsItem()
    {
        using var db = CreateDbContext();
        var category = await CreateCategoryAsync(db);
        var service = new ItemService(db);

        var created = await service.CreateAsync(CreateRequest(category.Id));

        var result = await service.GetByIdAsync(created.Id);

        Assert.NotNull(result);
        Assert.Equal(created.Id, result.Id);
        Assert.Equal(created.ItemCode, result.ItemCode);
        Assert.Equal(category.Name, result.CategoryName);
    }

    [Fact]
    public async Task GetByIdAsync_WhenItemDoesNotExist_ReturnsNull()
    {
        using var db = CreateDbContext();
        var service = new ItemService(db);

        var result = await service.GetByIdAsync(999);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetAllAsync_ReturnsItemsOrderedByName()
    {
        using var db = CreateDbContext();
        var category = await CreateCategoryAsync(db);
        var service = new ItemService(db);

        await service.CreateAsync(
            CreateRequest(category.Id, "ITEM-C", "Surgical Gloves",
                barcode: "BAR-C"));

        await service.CreateAsync(
            CreateRequest(category.Id, "ITEM-A", "Bandages",
                barcode: "BAR-A"));

        await service.CreateAsync(
            CreateRequest(category.Id, "ITEM-B", "Cotton",
                barcode: "BAR-B"));

        var result = await service.GetAllAsync();

        Assert.Equal(
            new[] { "Bandages", "Cotton", "Surgical Gloves" },
            result.Select(x => x.Name).ToArray());
    }

    [Fact]
    public async Task UpdateAsync_WithValidRequest_UpdatesItem()
    {
        using var db = CreateDbContext();
        var category = await CreateCategoryAsync(db);
        var service = new ItemService(db);

        var created = await service.CreateAsync(CreateRequest(category.Id));

        var result = await service.UpdateAsync(
            created.Id,
            UpdateRequest(category.Id));

        Assert.NotNull(result);
        Assert.Equal("MED-ITEM-UPDATED", result.ItemCode);
        Assert.Equal("Updated Gloves", result.Name);
        Assert.Equal("UPDATED-123", result.Barcode);
        Assert.Equal("Updated description", result.Description);
        Assert.NotNull(result.UpdatedAt);
    }

    [Fact]
    public async Task UpdateAsync_WithDuplicateItemCode_ThrowsInvalidOperationException()
    {
        using var db = CreateDbContext();
        var category = await CreateCategoryAsync(db);
        var service = new ItemService(db);

        var first = await service.CreateAsync(
            CreateRequest(category.Id, "ITEM-ONE", barcode: "BAR-ONE"));

        var second = await service.CreateAsync(
            CreateRequest(category.Id, "ITEM-TWO", barcode: "BAR-TWO"));

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.UpdateAsync(
                second.Id,
                UpdateRequest(category.Id, itemCode: first.ItemCode)));

        Assert.Equal("Item code already exists.", exception.Message);
    }

    [Fact]
    public async Task UpdateAsync_WithDuplicateBarcode_ThrowsInvalidOperationException()
    {
        using var db = CreateDbContext();
        var category = await CreateCategoryAsync(db);
        var service = new ItemService(db);

        var first = await service.CreateAsync(
            CreateRequest(category.Id, "ITEM-ONE", barcode: "BAR-ONE"));

        var second = await service.CreateAsync(
            CreateRequest(category.Id, "ITEM-TWO", barcode: "BAR-TWO"));

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.UpdateAsync(
                second.Id,
                UpdateRequest(
                    category.Id,
                    barcode: first.Barcode)));

        Assert.Equal("Barcode already exists.", exception.Message);
    }

    [Fact]
    public async Task UpdateAsync_WhenItemDoesNotExist_ReturnsNull()
    {
        using var db = CreateDbContext();
        var category = await CreateCategoryAsync(db);
        var service = new ItemService(db);

        var result = await service.UpdateAsync(
            999,
            UpdateRequest(category.Id));

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateAsync_WithInactiveCategory_ThrowsArgumentException()
    {
        using var db = CreateDbContext();
        var activeCategory = await CreateCategoryAsync(db);
        var inactiveCategory = await CreateCategoryAsync(
            db,
            name: "Inactive Supplies",
            code: "INACTIVE",
            isActive: false);

        var service = new ItemService(db);
        var created = await service.CreateAsync(
            CreateRequest(activeCategory.Id));

        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => service.UpdateAsync(
                created.Id,
                UpdateRequest(inactiveCategory.Id)));

        Assert.Equal(
            "Cannot assign an inactive category to an item.",
            exception.Message);
    }

    [Fact]
    public async Task DeleteAsync_WhenItemExists_DeletesItem()
    {
        using var db = CreateDbContext();
        var category = await CreateCategoryAsync(db);
        var service = new ItemService(db);

        var created = await service.CreateAsync(CreateRequest(category.Id));

        var deleted = await service.DeleteAsync(created.Id);
        var result = await service.GetByIdAsync(created.Id);

        Assert.True(deleted);
        Assert.Null(result);
    }

    [Fact]
    public async Task DeleteAsync_WhenItemDoesNotExist_ReturnsFalse()
    {
        using var db = CreateDbContext();
        var service = new ItemService(db);

        var result = await service.DeleteAsync(999);

        Assert.False(result);
    }
}