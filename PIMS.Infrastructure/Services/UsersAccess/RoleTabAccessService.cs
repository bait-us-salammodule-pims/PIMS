using Microsoft.EntityFrameworkCore;
using PIMS.Application.DTOs.UsersAccess;
using PIMS.Application.Interfaces.UsersAccess;
using PIMS.Domain.Entities;
using PIMS.Infrastructure.Persistence;

namespace PIMS.Infrastructure.Services.UsersAccess;

public class RoleTabAccessService : IRoleTabAccessService
{
    private readonly PimsDbContext _db;

    public RoleTabAccessService(PimsDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<RoleTabAccessDto>> GetByRoleIdAsync(
        int roleId,
        CancellationToken cancellationToken = default)
    {
        var roleExists = await _db.Roles
            .AnyAsync(
                x => x.Id == roleId,
                cancellationToken);

        if (!roleExists)
            throw new KeyNotFoundException(
                "Role not found.");

        return await _db.RoleTabAccesses
            .AsNoTracking()
            .Where(x => x.RoleId == roleId)
            .OrderBy(x => x.Tab.SortOrder)
            .Select(x => new RoleTabAccessDto(
                x.RoleId,
                x.TabId,
                x.Tab.Name,
                x.Tab.Code,
                x.CanView
            ))
            .ToListAsync(cancellationToken);
    }

    public async Task<RoleTabAccessDto> AssignAsync(
        int roleId,
        AssignRoleTabAccessDto request,
        CancellationToken cancellationToken = default)
    {
        var roleExists = await _db.Roles
            .AnyAsync(
                x => x.Id == roleId,
                cancellationToken);

        if (!roleExists)
            throw new KeyNotFoundException(
                "Role not found.");

        var tab = await _db.Tabs
            .FirstOrDefaultAsync(
                x => x.Id == request.TabId,
                cancellationToken);

        if (tab == null)
            throw new KeyNotFoundException(
                "Tab not found.");

        var access = await _db.RoleTabAccesses
            .FirstOrDefaultAsync(
                x =>
                    x.RoleId == roleId &&
                    x.TabId == request.TabId,
                cancellationToken);

        if (access == null)
        {
            access = new RoleTabAccess
            {
                RoleId = roleId,
                TabId = request.TabId,
                CanView = request.CanView
            };

            _db.RoleTabAccesses.Add(access);
        }
        else
        {
            access.CanView = request.CanView;
        }

        await _db.SaveChangesAsync(cancellationToken);

        return new RoleTabAccessDto(
            roleId,
            tab.Id,
            tab.Name,
            tab.Code,
            access.CanView
        );
    }

    public async Task RemoveAsync(
        int roleId,
        int tabId,
        CancellationToken cancellationToken = default)
    {
        var access = await _db.RoleTabAccesses
            .FirstOrDefaultAsync(
                x =>
                    x.RoleId == roleId &&
                    x.TabId == tabId,
                cancellationToken);

        if (access == null)
            throw new KeyNotFoundException(
                "Role tab access not found.");

        _db.RoleTabAccesses.Remove(access);

        await _db.SaveChangesAsync(cancellationToken);
    }
}