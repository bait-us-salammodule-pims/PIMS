using PIMS.Domain.Entities.Organization;

namespace PIMS.Application.Interfaces.Organization;

public interface IDepartmentRepository
{
    Task<List<Department>> GetAllAsync(
        int? branchId = null,
        bool includeInactive = false,
        CancellationToken cancellationToken = default);

    Task<Department?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<bool> ExistsByCodeAsync(
        int branchId,
        string code,
        int? excludeId = null,
        CancellationToken cancellationToken = default);

    Task<bool> HasActiveSubDepartmentsAsync(
        int departmentId,
        CancellationToken cancellationToken = default);

    Task AddAsync(
        Department entity,
        CancellationToken cancellationToken = default);
}