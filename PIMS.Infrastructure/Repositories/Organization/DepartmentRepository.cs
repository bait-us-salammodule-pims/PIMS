using Microsoft.EntityFrameworkCore;
using PIMS.Application.Interfaces.Organization;
using PIMS.Domain.Entities.Organization;
using PIMS.Infrastructure.Persistence;

namespace PIMS.Infrastructure.Repositories.Organization;

public class DepartmentRepository : IDepartmentRepository
{
    private readonly PimsDbContext _context;

    public DepartmentRepository(PimsDbContext context)
    {
        _context = context;
    }

    public async Task<List<Department>> GetAllAsync(
        int? branchId = null,
        bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Departments
            .AsNoTracking()
            .Include(x => x.Branch)
            .AsQueryable();

        if (branchId.HasValue)
        {
            query = query.Where(x => x.BranchId == branchId.Value);
        }

        if (!includeInactive)
        {
            query = query.Where(x => x.IsActive);
        }

        return await query
            .OrderBy(x => x.Code)
            .ToListAsync(cancellationToken);
    }

    public async Task<Department?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        return await _context.Departments
            .Include(x => x.Branch)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<bool> ExistsByCodeAsync(
        int branchId,
        string code,
        int? excludeId = null,
        CancellationToken cancellationToken = default)
    {
        var normalizedCode = code.Trim().ToUpperInvariant();

        var query = _context.Departments
            .Where(x =>
                x.BranchId == branchId &&
                x.Code.ToUpper() == normalizedCode);

        if (excludeId.HasValue)
        {
            query = query.Where(x => x.Id != excludeId.Value);
        }

        return await query.AnyAsync(cancellationToken);
    }

    public async Task<bool> HasActiveSubDepartmentsAsync(
        int departmentId,
        CancellationToken cancellationToken = default)
    {
        return await _context.SubDepartments
            .AnyAsync(
                x => x.DepartmentId == departmentId && x.IsActive,
                cancellationToken);
    }

    public async Task AddAsync(
        Department entity,
        CancellationToken cancellationToken = default)
    {
        await _context.Departments.AddAsync(entity, cancellationToken);
    }
}