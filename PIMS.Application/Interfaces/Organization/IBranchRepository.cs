using PIMS.Domain.Entities.Organization;

namespace PIMS.Application.Interfaces.Organization;

public interface IBranchRepository
{
    Task<List<Branch>> GetAllAsync(
        int? headOfficeId = null,
        bool includeInactive = false,
        CancellationToken cancellationToken = default);

    Task<Branch?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<bool> ExistsByCodeAsync(
        int headOfficeId,
        string code,
        int? excludeId = null,
        CancellationToken cancellationToken = default);

    Task<bool> HasActiveDepartmentsAsync(
        int branchId,
        CancellationToken cancellationToken = default);

    Task AddAsync(
        Branch entity,
        CancellationToken cancellationToken = default);
}