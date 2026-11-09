using Microsoft.EntityFrameworkCore;
using PIMS.Application.DTOs.UsersAccess;
using PIMS.Application.Interfaces.UsersAccess;
using PIMS.Domain.Entities.Auth;
using PIMS.Infrastructure.Persistence;

namespace PIMS.Infrastructure.Services.UsersAccess;

public class PermissionService : IPermissionService
{
    private readonly PimsDbContext _db;

    public PermissionService(PimsDbContext db)
    {
        _db = db;
    }

    public async Task<PermissionResponse> CreateAsync(
        CreatePermissionRequest request,
        CancellationToken cancellationToken = default)
    {
        var exists = await _db.PermissionDefinitions
            .AnyAsync(
                x => x.Code == request.Code,
                cancellationToken);

        if (exists)
            throw new InvalidOperationException(
                "Permission code already exists.");

        var permission = new PermissionDefinition(
            request.Code,
            request.Name,
            request.Module);

        _db.PermissionDefinitions.Add(permission);

        await _db.SaveChangesAsync(cancellationToken);

        return Map(permission);
    }

    public async Task<PermissionResponse?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var permission =
            await _db.PermissionDefinitions
                .FirstOrDefaultAsync(
                    x => x.Id == id,
                    cancellationToken);

        return permission == null
            ? null
            : Map(permission);
    }

    public async Task<IReadOnlyList<PermissionResponse>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        var permissions =
            await _db.PermissionDefinitions
                .AsNoTracking()
                .OrderBy(x => x.Module)
                .ThenBy(x => x.Code)
                .ToListAsync(cancellationToken);

        return permissions
            .Select(Map)
            .ToList();
    }

    public async Task ActivateAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var permission =
            await _db.PermissionDefinitions
                .FirstOrDefaultAsync(
                    x => x.Id == id,
                    cancellationToken);

        if (permission == null)
            throw new KeyNotFoundException(
                "Permission not found.");

        permission.Activate();

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task DeactivateAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var permission =
            await _db.PermissionDefinitions
                .FirstOrDefaultAsync(
                    x => x.Id == id,
                    cancellationToken);

        if (permission == null)
            throw new KeyNotFoundException(
                "Permission not found.");

        permission.Deactivate();

        await _db.SaveChangesAsync(cancellationToken);
    }

    private static PermissionResponse Map(
        PermissionDefinition permission)
    {
        return new PermissionResponse(
            permission.Id,
            permission.Code,
            permission.Name,
            permission.Module,
            permission.IsActive);
    }
}