using Microsoft.EntityFrameworkCore;
using PIMS.Application.Interfaces.Organization;
using PIMS.Domain.Entities.Organization;
using PIMS.Infrastructure.Persistence;

namespace PIMS.Infrastructure.Repositories.Organization;

public class SubDepartmentRepository : ISubDepartmentRepository
{
    private readonly PimsDbContext _context;

    public SubDepartmentRepository(PimsDbContext context)
    {
        _context = context;
    }

    public async Task<List<SubDepartment>> GetAllAsync(
        int? departmentId = null,
        bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var query = _context.SubDepartments
            .AsNoTracking()
            .Include(x => x.Department)
            .AsQueryable();

        if (departmentId.HasValue)
        {
            query = query.Where(x => x.DepartmentId == departmentId.Value);
        }

        if (!includeInactive)
        {
            query = query.Where(x => x.IsActive);
        }

        return await query
            .OrderBy(x => x.Code)
            .ToListAsync(cancellationToken);
    }

    public async Task<SubDepartment?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        return await _context.SubDepartments
            .Include(x => x.Department)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<bool> ExistsByCodeAsync(
        int departmentId,
        string code,
        int? excludeId = null,
        CancellationToken cancellationToken = default)
    {
        var normalizedCode = code.Trim().ToUpperInvariant();

        var query = _context.SubDepartments
            .Where(x =>
                x.DepartmentId == departmentId &&
                x.Code.ToUpper() == normalizedCode);

        if (excludeId.HasValue)
        {
            query = query.Where(x => x.Id != excludeId.Value);
        }

        return await query.AnyAsync(cancellationToken);
    }

    public async Task AddAsync(
        SubDepartment entity,
        CancellationToken cancellationToken = default)
    {
        await _context.SubDepartments.AddAsync(entity, cancellationToken);
    }
}