using Microsoft.EntityFrameworkCore;
using PIMS.Application.DTOs.UsersAccess;
using PIMS.Application.Interfaces.UsersAccess;
using PIMS.Domain.Entities.Auth;
using PIMS.Infrastructure.Persistence;

namespace PIMS.Infrastructure.Services.UsersAccess;

public class RoleManagementService : IRoleManagementService
{
    private readonly PimsDbContext _db;

    public RoleManagementService(PimsDbContext db)
    {
        _db = db;
    }

    public async Task<RoleResponse> CreateAsync(
        CreateRoleRequest request,
        CancellationToken cancellationToken = default)
    {
        var exists = await _db.Roles
            .AnyAsync(
                x => x.Name == request.Name,
                cancellationToken);

        if (exists)
            throw new InvalidOperationException(
                "Role already exists.");

        var role = new Role(
            request.Name,
            request.Description);

        _db.Roles.Add(role);

        await _db.SaveChangesAsync(cancellationToken);

        return Map(role);
    }

    public async Task<RoleResponse?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var role = await _db.Roles
            .Include(x => x.RolePermissions)
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        return role == null ? null : Map(role);
    }

    public async Task<IReadOnlyList<RoleResponse>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        var roles = await _db.Roles
            .Include(x => x.RolePermissions)
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);

        return roles
            .Select(Map)
            .ToList();
    }

    public async Task<RoleResponse> UpdateAsync(
        int id,
        UpdateRoleRequest request,
        CancellationToken cancellationToken = default)
    {
        var role = await _db.Roles
            .Include(x => x.RolePermissions)
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        if (role == null)
            throw new KeyNotFoundException(
                "Role not found.");

        var duplicate = await _db.Roles
            .AnyAsync(
                x => x.Id != id &&
                     x.Name == request.Name,
                cancellationToken);

        if (duplicate)
            throw new InvalidOperationException(
                "Role already exists.");

        role.Update(
            request.Name,
            request.Description);

        await _db.SaveChangesAsync(cancellationToken);

        return Map(role);
    }

    public async Task ActivateAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var role = await _db.Roles
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        if (role == null)
            throw new KeyNotFoundException(
                "Role not found.");

        role.Activate();

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task DeactivateAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var role = await _db.Roles
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        if (role == null)
            throw new KeyNotFoundException(
                "Role not found.");

        role.Deactivate();

        await _db.SaveChangesAsync(cancellationToken);
    }

    private static RoleResponse Map(Role role)
    {
        return new RoleResponse(
            role.Id,
            role.Name,
            role.Description,
            role.IsActive,
            role.RolePermissions
                .Select(x => x.PermissionId)
                .ToList());
    }
}