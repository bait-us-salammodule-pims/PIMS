using Microsoft.EntityFrameworkCore;
using PIMS.Application.DTOs.UsersAccess;
using PIMS.Application.Interfaces.UsersAccess;
using PIMS.Domain.Entities;
using PIMS.Infrastructure.Persistence;

namespace PIMS.Infrastructure.Services.UsersAccess;

public class UserStoreAssignmentService : IUserStoreAssignmentService
{
    private readonly PimsDbContext _db;

    public UserStoreAssignmentService(PimsDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<UserStoreAssignmentResponse>>
        GetByUserIdAsync(
            int userId,
            CancellationToken cancellationToken = default)
    {
        var userExists = await _db.Users
            .AnyAsync(x => x.Id == userId, cancellationToken);

        if (!userExists)
            throw new KeyNotFoundException("User not found.");

        return await _db.UserStoreAssignments
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.IsDefault)
            .ThenBy(x => x.Store.Name)
            .Select(x => new UserStoreAssignmentResponse(
                x.UserId,
                x.StoreId,
                x.Store.Name,
                x.Store.Code,
                x.IsDefault))
            .ToListAsync(cancellationToken);
    }

    public async Task<UserStoreAssignmentResponse> AssignAsync(
        int userId,
        AssignUserStoreRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.StoreId <= 0)
            throw new ArgumentException("A valid store ID is required.");

        var userExists = await _db.Users
            .AnyAsync(x => x.Id == userId, cancellationToken);

        if (!userExists)
            throw new KeyNotFoundException("User not found.");

        var store = await _db.Stores
            .FirstOrDefaultAsync(
                x => x.Id == request.StoreId && x.IsActive,
                cancellationToken);

        if (store is null)
            throw new KeyNotFoundException("Active store not found.");

        var assignments = await _db.UserStoreAssignments
            .Where(x => x.UserId == userId)
            .ToListAsync(cancellationToken);

        var existing = assignments
            .FirstOrDefault(x => x.StoreId == request.StoreId);

        var shouldBeDefault =
            request.IsDefault || assignments.All(x => !x.IsDefault);

        if (shouldBeDefault)
        {
            foreach (var assignment in assignments)
                assignment.IsDefault = false;
        }

        if (existing is null)
        {
            existing = new UserStoreAssignment
            {
                UserId = userId,
                StoreId = request.StoreId,
                IsDefault = shouldBeDefault
            };

            _db.UserStoreAssignments.Add(existing);
        }
        else if (shouldBeDefault)
        {
            existing.IsDefault = true;
        }

        await _db.SaveChangesAsync(cancellationToken);

        return new UserStoreAssignmentResponse(
            userId,
            store.Id,
            store.Name,
            store.Code,
            existing.IsDefault);
    }

    public async Task SetDefaultAsync(
        int userId,
        int storeId,
        CancellationToken cancellationToken = default)
    {
        var assignments = await _db.UserStoreAssignments
            .Where(x => x.UserId == userId)
            .ToListAsync(cancellationToken);

        if (assignments.Count == 0)
        {
            var userExists = await _db.Users
                .AnyAsync(x => x.Id == userId, cancellationToken);

            if (!userExists)
                throw new KeyNotFoundException("User not found.");

            throw new KeyNotFoundException(
                "The user has no assigned stores.");
        }

        var selected = assignments
            .FirstOrDefault(x => x.StoreId == storeId);

        if (selected is null)
            throw new KeyNotFoundException(
                "This store is not assigned to the user.");

        foreach (var assignment in assignments)
            assignment.IsDefault = assignment.StoreId == storeId;

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task RemoveAsync(
        int userId,
        int storeId,
        CancellationToken cancellationToken = default)
    {
        var assignment = await _db.UserStoreAssignments
            .FirstOrDefaultAsync(
                x => x.UserId == userId && x.StoreId == storeId,
                cancellationToken);

        if (assignment is null)
            throw new KeyNotFoundException(
                "Store assignment not found.");

        var wasDefault = assignment.IsDefault;

        _db.UserStoreAssignments.Remove(assignment);

        if (wasDefault)
        {
            var nextAssignment = await _db.UserStoreAssignments
                .Where(x => x.UserId == userId && x.StoreId != storeId)
                .OrderBy(x => x.Store.Name)
                .FirstOrDefaultAsync(cancellationToken);

            if (nextAssignment is not null)
                nextAssignment.IsDefault = true;
        }

        await _db.SaveChangesAsync(cancellationToken);
    }
}