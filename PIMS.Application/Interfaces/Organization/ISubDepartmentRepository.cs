using PIMS.Domain.Entities.Organization;

namespace PIMS.Application.Interfaces.Organization;

public interface ISubDepartmentRepository
{
    Task<List<SubDepartment>> GetAllAsync(
        int? departmentId = null,
        bool includeInactive = false,
        CancellationToken cancellationToken = default);

    Task<SubDepartment?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<bool> ExistsByCodeAsync(
        int departmentId,
        string code,
        int? excludeId = null,
        CancellationToken cancellationToken = default);

    Task AddAsync(
        SubDepartment entity,
        CancellationToken cancellationToken = default);
}