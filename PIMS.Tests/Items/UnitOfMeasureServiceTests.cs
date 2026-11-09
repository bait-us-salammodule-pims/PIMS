using Microsoft.EntityFrameworkCore;
using PIMS.Application.DTOs.Items;
using PIMS.Domain.Entities.Items;
using PIMS.Infrastructure.Persistence;
using PIMS.Infrastructure.Services.Items;
using Xunit;

namespace PIMS.Tests.Items;

public sealed class UnitOfMeasureServiceTests
{
    private static PimsDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<PimsDbContext>()
            .UseInMemoryDatabase($"UomTests_{Guid.NewGuid()}")
            .Options;

        return new PimsDbContext(options);
    }

    private static CreateUnitOfMeasureDto CreateRequest(
        string name = "Piece",
        string code = "PCS",
        string? description = "Individual item")
        => new(name, code, description);

    private static UpdateUnitOfMeasureDto UpdateRequest(
        string name = "Kilogram",
        string code = "KG",
        string? description = "Weight measurement",
        bool isActive = true)
        => new(name, code, description, isActive);

    [Fact]
    public async Task CreateAsync_WithValidRequest_CreatesUnit()
    {
        using var db = CreateDbContext();
        var service = new UnitOfMeasureService(db);

        var result = await service.CreateAsync(CreateRequest());

        Assert.True(result.Id > 0);
        Assert.Equal("Piece", result.Name);
        Assert.Equal("PCS", result.Code);
        Assert.Equal("Individual item", result.Description);
        Assert.True(result.IsActive);
    }

    [Fact]
    public async Task CreateAsync_NormalizesInput()
    {
        using var db = CreateDbContext();
        var service = new UnitOfMeasureService(db);

        var result = await service.CreateAsync(
            CreateRequest(" Piece ", " pcs ", " Description "));

        Assert.Equal("Piece", result.Name);
        Assert.Equal("PCS", result.Code);
        Assert.Equal("Description", result.Description);
    }

    [Fact]
    public async Task CreateAsync_DuplicateName_ThrowsException()
    {
        using var db = CreateDbContext();
        var service = new UnitOfMeasureService(db);

        await service.CreateAsync(CreateRequest("Piece", "PCS"));

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CreateAsync(CreateRequest("piece", "PC")));

        Assert.Equal("Unit name already exists.", exception.Message);
    }

    [Fact]
    public async Task CreateAsync_DuplicateCode_ThrowsException()
    {
        using var db = CreateDbContext();
        var service = new UnitOfMeasureService(db);

        await service.CreateAsync(CreateRequest("Piece", "PCS"));

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CreateAsync(CreateRequest("Pack", "pcs")));

        Assert.Equal("Unit code already exists.", exception.Message);
    }

    [Fact]
    public async Task CreateAsync_BlankName_ThrowsException()
    {
        using var db = CreateDbContext();
        var service = new UnitOfMeasureService(db);

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.CreateAsync(CreateRequest(name: " ")));
    }

    [Fact]
    public async Task CreateAsync_BlankCode_ThrowsException()
    {
        using var db = CreateDbContext();
        var service = new UnitOfMeasureService(db);

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.CreateAsync(CreateRequest(code: " ")));
    }

    [Fact]
    public async Task CreateAsync_BlankDescription_StoresNull()
    {
        using var db = CreateDbContext();
        var service = new UnitOfMeasureService(db);

        var result = await service.CreateAsync(
            CreateRequest(description: " "));

        Assert.Null(result.Description);
    }

    [Fact]
    public async Task CreateAsync_NameOver100Characters_ThrowsException()
    {
        using var db = CreateDbContext();
        var service = new UnitOfMeasureService(db);

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.CreateAsync(
                CreateRequest(name: new string('N', 101))));
    }

    [Fact]
    public async Task CreateAsync_CodeOver20Characters_ThrowsException()
    {
        using var db = CreateDbContext();
        var service = new UnitOfMeasureService(db);

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.CreateAsync(
                CreateRequest(code: new string('C', 21))));
    }

    [Fact]
    public async Task CreateAsync_DescriptionOver500Characters_ThrowsException()
    {
        using var db = CreateDbContext();
        var service = new UnitOfMeasureService(db);

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.CreateAsync(
                CreateRequest(description: new string('D', 501))));
    }

    [Fact]
    public async Task GetByIdAsync_ExistingUnit_ReturnsUnit()
    {
        using var db = CreateDbContext();
        var service = new UnitOfMeasureService(db);
        var created = await service.CreateAsync(CreateRequest());

        var result = await service.GetByIdAsync(created.Id);

        Assert.NotNull(result);
        Assert.Equal(created.Id, result.Id);
    }

    [Fact]
    public async Task GetByIdAsync_MissingUnit_ReturnsNull()
    {
        using var db = CreateDbContext();
        var service = new UnitOfMeasureService(db);

        Assert.Null(await service.GetByIdAsync(999));
    }

    [Fact]
    public async Task GetAllAsync_ReturnsUnitsSortedByName()
    {
        using var db = CreateDbContext();
        var service = new UnitOfMeasureService(db);

        await service.CreateAsync(CreateRequest("Piece", "PCS"));
        await service.CreateAsync(CreateRequest("Kilogram", "KG"));
        await service.CreateAsync(CreateRequest("Bottle", "BTL"));

        var result = await service.GetAllAsync();

        Assert.Equal(
            new[] { "Bottle", "Kilogram", "Piece" },
            result.Select(x => x.Name).ToArray());
    }

    [Fact]
    public async Task UpdateAsync_ValidRequest_UpdatesUnit()
    {
        using var db = CreateDbContext();
        var service = new UnitOfMeasureService(db);
        var created = await service.CreateAsync(CreateRequest());

        var result = await service.UpdateAsync(
            created.Id, UpdateRequest());

        Assert.NotNull(result);
        Assert.Equal("Kilogram", result.Name);
        Assert.Equal("KG", result.Code);
        Assert.NotNull(result.UpdatedAt);
    }

    [Fact]
    public async Task UpdateAsync_DuplicateName_ThrowsException()
    {
        using var db = CreateDbContext();
        var service = new UnitOfMeasureService(db);

        await service.CreateAsync(CreateRequest("Piece", "PCS"));
        var second = await service.CreateAsync(
            CreateRequest("Pack", "PACK"));

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.UpdateAsync(
                second.Id, UpdateRequest(name: "Piece", code: "PACK")));
    }

    [Fact]
    public async Task UpdateAsync_DuplicateCode_ThrowsException()
    {
        using var db = CreateDbContext();
        var service = new UnitOfMeasureService(db);

        await service.CreateAsync(CreateRequest("Piece", "PCS"));
        var second = await service.CreateAsync(
            CreateRequest("Pack", "PACK"));

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.UpdateAsync(
                second.Id, UpdateRequest(name: "Box", code: "PCS")));
    }

    [Fact]
    public async Task UpdateAsync_MissingUnit_ReturnsNull()
    {
        using var db = CreateDbContext();
        var service = new UnitOfMeasureService(db);

        Assert.Null(await service.UpdateAsync(999, UpdateRequest()));
    }

    [Fact]
    public async Task UpdateAsync_CanDeactivateUnit()
    {
        using var db = CreateDbContext();
        var service = new UnitOfMeasureService(db);
        var created = await service.CreateAsync(CreateRequest());

        var result = await service.UpdateAsync(
            created.Id,
            UpdateRequest(
                name: created.Name,
                code: created.Code,
                description: created.Description,
                isActive: false));

        Assert.NotNull(result);
        Assert.False(result.IsActive);
    }

    [Fact]
    public async Task DeleteAsync_ExistingUnit_SoftDeletesUnit()
    {
        using var db = CreateDbContext();
        var service = new UnitOfMeasureService(db);
        var created = await service.CreateAsync(CreateRequest());

        var deleteResult = await service.DeleteAsync(created.Id);

        Assert.True(deleteResult);

        var deletedUnit = await service.GetByIdAsync(created.Id);

        Assert.NotNull(deletedUnit);
        Assert.Equal(created.Id, deletedUnit.Id);
        Assert.False(deletedUnit.IsActive);
        Assert.NotNull(deletedUnit.UpdatedAt);
    }

    [Fact]
    public async Task DeleteAsync_MissingUnit_ReturnsFalse()
    {
        using var db = CreateDbContext();
        var service = new UnitOfMeasureService(db);

        Assert.False(await service.DeleteAsync(999));
    }
}