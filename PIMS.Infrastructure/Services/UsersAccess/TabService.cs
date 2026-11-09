using Microsoft.EntityFrameworkCore;
using PIMS.Application.DTOs.UsersAccess;
using PIMS.Application.Interfaces.UsersAccess;
using PIMS.Domain.Entities;
using PIMS.Infrastructure.Persistence;

namespace PIMS.Infrastructure.Services.UsersAccess;

public class TabService : ITabService
{
    private readonly PimsDbContext _db;

    public TabService(PimsDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<TabDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        return await _db.Tabs
            .AsNoTracking()
            .OrderBy(x => x.SortOrder)
            .Select(x => new TabDto(
                x.Id,
                x.Name,
                x.Code,
                x.Route,
                x.Icon,
                x.SortOrder,
                x.IsActive
            ))
            .ToListAsync(cancellationToken);
    }

    public async Task<TabDto> CreateAsync(
        CreateTabDto request,
        CancellationToken cancellationToken = default)
    {
        var exists = await _db.Tabs
            .AnyAsync(
                x => x.Code == request.Code,
                cancellationToken);

        if (exists)
            throw new InvalidOperationException(
                "Tab code already exists.");

        var tab = new Tab
        {
            Name = request.Name,
            Code = request.Code,
            Route = request.Route,
            Icon = request.Icon,
            SortOrder = request.SortOrder,
            IsActive = true
        };

        _db.Tabs.Add(tab);

        await _db.SaveChangesAsync(cancellationToken);

        return new TabDto(
            tab.Id,
            tab.Name,
            tab.Code,
            tab.Route,
            tab.Icon,
            tab.SortOrder,
            tab.IsActive
        );
    }
}