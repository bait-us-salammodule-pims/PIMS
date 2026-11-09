using Microsoft.EntityFrameworkCore;
using PIMS.Application.DTOs.Items;
using PIMS.Domain.Entities.Items;
using PIMS.Infrastructure.Persistence;
using PIMS.Infrastructure.Services.Items;
using Xunit;

namespace PIMS.Tests.Items;

public sealed class ItemCategoryServiceTests
{
    private static PimsDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<PimsDbContext>()
            .UseInMemoryDatabase(
                $"ItemCategoryTests_{Guid.NewGuid()}")
            .Options;

        return new PimsDbContext(options);
    }

    private static CreateItemCategoryDto CreateRequest(
        string name = "Medical Supplies",
        string code = "MED-SUP",
        string? description = "Medical supplies",
        int? parentCategoryId = null)
    {
        return new CreateItemCategoryDto(
            name,
            code,
            description,
            parentCategoryId);
    }

    private static UpdateItemCategoryDto UpdateRequest(
        string name = "Updated Supplies",
        string code = "UPDATED-SUP",
        string? description = "Updated description",
        bool isActive = true,
        int? parentCategoryId = null)
    {
        return new UpdateItemCategoryDto(
            name,
            code,
            description,
            isActive,
            parentCategoryId);
    }

    [Fact]
    public async Task CreateAsync_WithValidRequest_CreatesCategory()
    {
        using var db = CreateDbContext();
        var service = new ItemCategoryService(db);

        var result = await service.CreateAsync(CreateRequest());

        Assert.True(result.Id > 0);
        Assert.Equal("Medical Supplies", result.Name);
        Assert.Equal("MED-SUP", result.Code);
        Assert.Equal("Medical supplies", result.Description);
        Assert.Null(result.ParentCategoryId);
        Assert.True(result.IsActive);
        Assert.NotEqual(default, result.CreatedAt);
    }

    [Fact]
    public async Task CreateAsync_TrimsNameAndNormalizesCode()
    {
        using var db = CreateDbContext();
        var service = new ItemCategoryService(db);

        var result = await service.CreateAsync(
            CreateRequest("  Medical Supplies  ", "  med-sup  "));

        Assert.Equal("Medical Supplies", result.Name);
        Assert.Equal("MED-SUP", result.Code);
    }

    [Fact]
    public async Task CreateAsync_WithDuplicateCode_ThrowsInvalidOperationException()
    {
        using var db = CreateDbContext();
        var service = new ItemCategoryService(db);

        await service.CreateAsync(CreateRequest());

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CreateAsync(
                CreateRequest("Another Category", "MED-SUP")));

        Assert.Equal("Category code already exists.", exception.Message);
    }

    [Fact]
    public async Task CreateAsync_WithMissingName_ThrowsArgumentException()
    {
        using var db = CreateDbContext();
        var service = new ItemCategoryService(db);

        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => service.CreateAsync(
                CreateRequest(name: "  ")));

        Assert.Equal("Category name is required.", exception.Message);
    }

    [Fact]
    public async Task CreateAsync_WithMissingCode_ThrowsArgumentException()
    {
        using var db = CreateDbContext();
        var service = new ItemCategoryService(db);

        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => service.CreateAsync(
                CreateRequest(code: "  ")));

        Assert.Equal("Category code is required.", exception.Message);
    }

    [Fact]
    public async Task CreateAsync_WithUnknownParent_ThrowsArgumentException()
    {
        using var db = CreateDbContext();
        var service = new ItemCategoryService(db);

        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => service.CreateAsync(
                CreateRequest(parentCategoryId: 999)));

        Assert.Equal("Parent category was not found.", exception.Message);
    }

    [Fact]
    public async Task CreateAsync_WithValidParent_CreatesSubcategory()
    {
        using var db = CreateDbContext();
        var service = new ItemCategoryService(db);

        var parent = await service.CreateAsync(
            CreateRequest("Medical Supplies", "MED-SUP"));

        var child = await service.CreateAsync(
            CreateRequest(
                "Gloves",
                "GLOVES",
                parentCategoryId: parent.Id));

        Assert.Equal(parent.Id, child.ParentCategoryId);
    }

    [Fact]
    public async Task GetByIdAsync_WhenCategoryExists_ReturnsCategory()
    {
        using var db = CreateDbContext();
        var service = new ItemCategoryService(db);

        var created = await service.CreateAsync(CreateRequest());

        var result = await service.GetByIdAsync(created.Id);

        Assert.NotNull(result);
        Assert.Equal(created.Id, result.Id);
        Assert.Equal(created.Code, result.Code);
    }

    [Fact]
    public async Task GetByIdAsync_WhenCategoryDoesNotExist_ReturnsNull()
    {
        using var db = CreateDbContext();
        var service = new ItemCategoryService(db);

        var result = await service.GetByIdAsync(999);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetAllAsync_ReturnsCategoriesOrderedByName()
    {
        using var db = CreateDbContext();
        var service = new ItemCategoryService(db);

        await service.CreateAsync(CreateRequest("Surgical Supplies", "SURG"));
        await service.CreateAsync(CreateRequest("Medical Supplies", "MED"));
        await service.CreateAsync(CreateRequest("Dental Supplies", "DENT"));

        var result = await service.GetAllAsync();

        Assert.Equal(
            new[] { "Dental Supplies", "Medical Supplies", "Surgical Supplies" },
            result.Select(x => x.Name).ToArray());
    }

    [Fact]
    public async Task UpdateAsync_WithValidRequest_UpdatesCategory()
    {
        using var db = CreateDbContext();
        var service = new ItemCategoryService(db);

        var created = await service.CreateAsync(CreateRequest());

        var result = await service.UpdateAsync(
            created.Id,
            UpdateRequest());

        Assert.NotNull(result);
        Assert.Equal("Updated Supplies", result.Name);
        Assert.Equal("UPDATED-SUP", result.Code);
        Assert.Equal("Updated description", result.Description);
        Assert.NotNull(result.UpdatedAt);
    }

    [Fact]
    public async Task UpdateAsync_WhenCategoryDoesNotExist_ReturnsNull()
    {
        using var db = CreateDbContext();
        var service = new ItemCategoryService(db);

        var result = await service.UpdateAsync(
            999,
            UpdateRequest());

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateAsync_WithOwnIdAsParent_ThrowsArgumentException()
    {
        using var db = CreateDbContext();
        var service = new ItemCategoryService(db);

        var created = await service.CreateAsync(CreateRequest());

        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => service.UpdateAsync(
                created.Id,
                UpdateRequest(parentCategoryId: created.Id)));

        Assert.Equal(
            "A category cannot be its own parent.",
            exception.Message);
    }

    [Fact]
    public async Task DeleteAsync_WhenCategoryHasSubcategories_ThrowsInvalidOperationException()
    {
        using var db = CreateDbContext();
        var service = new ItemCategoryService(db);

        var parent = await service.CreateAsync(
            CreateRequest("Medical Supplies", "MED"));

        await service.CreateAsync(
            CreateRequest(
                "Gloves",
                "GLOVES",
                parentCategoryId: parent.Id));

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.DeleteAsync(parent.Id));

        Assert.Equal(
            "Cannot delete a category that has subcategories.",
            exception.Message);
    }

    [Fact]
    public async Task DeleteAsync_WhenCategoryExists_DeletesCategory()
    {
        using var db = CreateDbContext();
        var service = new ItemCategoryService(db);

        var created = await service.CreateAsync(CreateRequest());

        var deleted = await service.DeleteAsync(created.Id);
        var result = await service.GetByIdAsync(created.Id);

        Assert.True(deleted);
        Assert.Null(result);
    }

    [Fact]
    public async Task DeleteAsync_WhenCategoryDoesNotExist_ReturnsFalse()
    {
        using var db = CreateDbContext();
        var service = new ItemCategoryService(db);

        var result = await service.DeleteAsync(999);

        Assert.False(result);
    }
}