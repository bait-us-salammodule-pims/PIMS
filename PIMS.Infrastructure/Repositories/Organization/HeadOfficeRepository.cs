using Microsoft.EntityFrameworkCore;
using PIMS.Application.Interfaces.Organization;
using PIMS.Domain.Entities.Organization;
using PIMS.Infrastructure.Persistence;

namespace PIMS.Infrastructure.Repositories.Organization;

public class HeadOfficeRepository : IHeadOfficeRepository
{
    private readonly PimsDbContext _context;

    public HeadOfficeRepository(PimsDbContext context)
    {
        _context = context;
    }

    public async Task<List<HeadOffice>> GetAllAsync(
        bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var query = _context.HeadOffices
            .AsNoTracking();

        if (!includeInactive)
        {
            query = query.Where(x => x.IsActive);
        }

        return await query
            .OrderBy(x => x.Code)
            .ToListAsync(cancellationToken);
    }

    public async Task<HeadOffice?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        return await _context.HeadOffices
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<bool> ExistsByCodeAsync(
        string code,
        int? excludeId = null,
        CancellationToken cancellationToken = default)
    {
        var normalizedCode = code.Trim().ToUpperInvariant();

        var query = _context.HeadOffices
            .Where(x => x.Code.ToUpper() == normalizedCode);

        if (excludeId.HasValue)
        {
            query = query.Where(x => x.Id != excludeId.Value);
        }

        return await query.AnyAsync(cancellationToken);
    }

    public async Task<bool> HasActiveBranchesAsync(
        int headOfficeId,
        CancellationToken cancellationToken = default)
    {
        return await _context.Branches
            .AnyAsync(
                x => x.HeadOfficeId == headOfficeId && x.IsActive,
                cancellationToken);
    }

    public async Task AddAsync(
        HeadOffice entity,
        CancellationToken cancellationToken = default)
    {
        await _context.HeadOffices.AddAsync(entity, cancellationToken);
    }
}