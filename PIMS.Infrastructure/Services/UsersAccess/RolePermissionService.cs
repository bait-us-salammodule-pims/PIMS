
using Microsoft.EntityFrameworkCore;
using PIMS.Application.DTOs.UsersAccess;
using PIMS.Application.Interfaces.UsersAccess;
using PIMS.Domain.Entities.Auth;
using PIMS.Infrastructure.Persistence;

namespace PIMS.Infrastructure.Services.UsersAccess;

public class RolePermissionService : IRolePermissionService
{
    private readonly PimsDbContext _db;

    public RolePermissionService(PimsDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<PermissionResponse>> GetByRoleIdAsync(
        int roleId,
        CancellationToken cancellationToken = default)
    {
        var roleExists = await _db.Roles
            .AnyAsync(x => x.Id == roleId, cancellationToken);

        if (!roleExists)
            throw new KeyNotFoundException("Role not found.");

        return await (
            from rolePermission in _db.RolePermissions.AsNoTracking()
            join permission in _db.PermissionDefinitions.AsNoTracking()
                on rolePermission.PermissionId equals permission.Id
            where rolePermission.RoleId == roleId
            orderby permission.Module, permission.Code
            select new PermissionResponse(
                permission.Id,
                permission.Code,
                permission.Name,
                permission.Module,
                permission.IsActive
            )
        ).ToListAsync(cancellationToken);
    }

    public async Task<PermissionResponse> AssignAsync(
        int roleId,
        int permissionId,
        CancellationToken cancellationToken = default)
    {
        var role = await _db.Roles
            .FirstOrDefaultAsync(
                x => x.Id == roleId,
                cancellationToken);

        if (role is null)
            throw new KeyNotFoundException("Role not found.");

        var permission = await _db.PermissionDefinitions
            .FirstOrDefaultAsync(
                x => x.Id == permissionId,
                cancellationToken);

        if (permission is null)
            throw new KeyNotFoundException("Permission not found.");

        var alreadyAssigned = await _db.RolePermissions
            .AnyAsync(
                x => x.RoleId == roleId &&
                     x.PermissionId == permissionId,
                cancellationToken);

        if (!alreadyAssigned)
        {
            _db.RolePermissions.Add(
                new RolePermission(roleId, permissionId));

            await _db.SaveChangesAsync(cancellationToken);
        }

        return new PermissionResponse(
            permission.Id,
            permission.Code,
            permission.Name,
            permission.Module,
            permission.IsActive);
    }

    public async Task RemoveAsync(
        int roleId,
        int permissionId,
        CancellationToken cancellationToken = default)
    {
        var rolePermission = await _db.RolePermissions
            .FirstOrDefaultAsync(
                x => x.RoleId == roleId &&
                     x.PermissionId == permissionId,
                cancellationToken);

        if (rolePermission is null)
            throw new KeyNotFoundException(
                "Role permission assignment not found.");

        _db.RolePermissions.Remove(rolePermission);

        await _db.SaveChangesAsync(cancellationToken);
    }
}
