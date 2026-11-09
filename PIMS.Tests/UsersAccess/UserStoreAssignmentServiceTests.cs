using Microsoft.EntityFrameworkCore;
using PIMS.Application.DTOs.UsersAccess;
using PIMS.Domain.Entities;
using PIMS.Domain.Entities.Auth;
using PIMS.Infrastructure.Persistence;
using PIMS.Infrastructure.Services.UsersAccess;

namespace PIMS.Tests.UsersAccess;

public class UserStoreAssignmentServiceTests
{
    private static PimsDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<PimsDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new PimsDbContext(options);
    }

    private static async Task SeedDataAsync(PimsDbContext db)
    {
        var user = new User(
            "Test User",
            "testuser",
            "testuser@pims.com");

        // User entity requires a password hash.
        user.SetPasswordHash("test-password-hash");

        db.Users.Add(user);

        db.Stores.AddRange(
            new Store
            {
                Name = "Main Store",
                Code = "MAIN-001",
                IsActive = true
            },
            new Store
            {
                Name = "Secondary Store",
                Code = "SEC-002",
                IsActive = true
            },
            new Store
            {
                Name = "Inactive Store",
                Code = "INACTIVE-003",
                IsActive = false
            });

        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task FirstAssignment_ShouldBecomeDefault()
    {
        await using var db = CreateContext();
        await SeedDataAsync(db);

        var service = new UserStoreAssignmentService(db);

        var result = await service.AssignAsync(
            1,
            new AssignUserStoreRequest(1));

        Assert.Equal(1, result.UserId);
        Assert.Equal(1, result.StoreId);
        Assert.True(result.IsDefault);
    }

    [Fact]
    public async Task AssigningAnotherStore_ShouldKeepExistingDefault()
    {
        await using var db = CreateContext();
        await SeedDataAsync(db);

        var service = new UserStoreAssignmentService(db);

        await service.AssignAsync(1, new AssignUserStoreRequest(1));
        await service.AssignAsync(1, new AssignUserStoreRequest(2));

        var assignments = await service.GetByUserIdAsync(1);

        Assert.Equal(2, assignments.Count);
        Assert.True(assignments.Single(x => x.StoreId == 1).IsDefault);
        Assert.False(assignments.Single(x => x.StoreId == 2).IsDefault);
    }

    [Fact]
    public async Task SettingDefault_ShouldMakeOnlySelectedStoreDefault()
    {
        await using var db = CreateContext();
        await SeedDataAsync(db);

        var service = new UserStoreAssignmentService(db);

        await service.AssignAsync(1, new AssignUserStoreRequest(1));
        await service.AssignAsync(1, new AssignUserStoreRequest(2));

        await service.SetDefaultAsync(1, 2);

        var assignments = await service.GetByUserIdAsync(1);

        Assert.False(assignments.Single(x => x.StoreId == 1).IsDefault);
        Assert.True(assignments.Single(x => x.StoreId == 2).IsDefault);
        Assert.Single(assignments, x => x.IsDefault);
    }

    [Fact]
    public async Task RemovingDefaultStore_ShouldSelectFallbackDefault()
    {
        await using var db = CreateContext();
        await SeedDataAsync(db);

        var service = new UserStoreAssignmentService(db);

        await service.AssignAsync(1, new AssignUserStoreRequest(1));
        await service.AssignAsync(1, new AssignUserStoreRequest(2));

        await service.RemoveAsync(1, 1);

        var assignments = await service.GetByUserIdAsync(1);

        var assignment = Assert.Single(assignments);

        Assert.Equal(2, assignment.StoreId);
        Assert.True(assignment.IsDefault);
    }

    [Fact]
    public async Task AssigningSameStoreTwice_ShouldNotCreateDuplicate()
    {
        await using var db = CreateContext();
        await SeedDataAsync(db);

        var service = new UserStoreAssignmentService(db);

        await service.AssignAsync(1, new AssignUserStoreRequest(1));
        await service.AssignAsync(1, new AssignUserStoreRequest(1));

        var assignments = await service.GetByUserIdAsync(1);

        Assert.Single(assignments);
    }

    [Fact]
    public async Task AssigningToUnknownUser_ShouldThrowKeyNotFound()
    {
        await using var db = CreateContext();
        await SeedDataAsync(db);

        var service = new UserStoreAssignmentService(db);

        var exception = await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.AssignAsync(
                999,
                new AssignUserStoreRequest(1)));

        Assert.Equal("User not found.", exception.Message);
    }

    [Fact]
    public async Task AssigningInactiveStore_ShouldThrowKeyNotFound()
    {
        await using var db = CreateContext();
        await SeedDataAsync(db);

        var service = new UserStoreAssignmentService(db);

        var exception = await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.AssignAsync(
                1,
                new AssignUserStoreRequest(3)));

        Assert.Equal("Active store not found.", exception.Message);
    }

    [Fact]
    public async Task AssigningInvalidStoreId_ShouldThrowArgumentException()
    {
        await using var db = CreateContext();
        await SeedDataAsync(db);

        var service = new UserStoreAssignmentService(db);

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.AssignAsync(
                1,
                new AssignUserStoreRequest(0)));
    }
}
