using PIMS.Domain.Entities.Organization;

namespace PIMS.Application.Interfaces.Organization;

public interface IHeadOfficeRepository
{
    Task<List<HeadOffice>> GetAllAsync(
        bool includeInactive = false,
        CancellationToken cancellationToken = default);

    Task<HeadOffice?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<bool> ExistsByCodeAsync(
        string code,
        int? excludeId = null,
        CancellationToken cancellationToken = default);

    Task<bool> HasActiveBranchesAsync(
        int headOfficeId,
        CancellationToken cancellationToken = default);

    Task AddAsync(
        HeadOffice entity,
        CancellationToken cancellationToken = default);
}