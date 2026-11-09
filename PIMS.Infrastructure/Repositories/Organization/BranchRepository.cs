using Microsoft.EntityFrameworkCore;
using PIMS.Application.Interfaces.Organization;
using PIMS.Domain.Entities.Organization;
using PIMS.Infrastructure.Persistence;

namespace PIMS.Infrastructure.Repositories.Organization;

public class BranchRepository : IBranchRepository
{
    private readonly PimsDbContext _context;

    public BranchRepository(PimsDbContext context)
    {
        _context = context;
    }

    public async Task<List<Branch>> GetAllAsync(
        int? headOfficeId = null,
        bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Branches
            .AsNoTracking()
            .Include(x => x.HeadOffice)
            .AsQueryable();

        if (headOfficeId.HasValue)
        {
            query = query.Where(x => x.HeadOfficeId == headOfficeId.Value);
        }

        if (!includeInactive)
        {
            query = query.Where(x => x.IsActive);
        }

        return await query
            .OrderBy(x => x.Code)
            .ToListAsync(cancellationToken);
    }

    public async Task<Branch?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        return await _context.Branches
            .Include(x => x.HeadOffice)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<bool> ExistsByCodeAsync(
        int headOfficeId,
        string code,
        int? excludeId = null,
        CancellationToken cancellationToken = default)
    {
        var normalizedCode = code.Trim().ToUpperInvariant();

        var query = _context.Branches
            .Where(x =>
                x.HeadOfficeId == headOfficeId &&
                x.Code.ToUpper() == normalizedCode);

        if (excludeId.HasValue)
        {
            query = query.Where(x => x.Id != excludeId.Value);
        }

        return await query.AnyAsync(cancellationToken);
    }

    public async Task<bool> HasActiveDepartmentsAsync(
        int branchId,
        CancellationToken cancellationToken = default)
    {
        return await _context.Departments
            .AnyAsync(
                x => x.BranchId == branchId && x.IsActive,
                cancellationToken);
    }

    public async Task AddAsync(
        Branch entity,
        CancellationToken cancellationToken = default)
    {
        await _context.Branches.AddAsync(entity, cancellationToken);
    }
}