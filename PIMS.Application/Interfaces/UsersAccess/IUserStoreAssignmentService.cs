using PIMS.Application.DTOs.UsersAccess;

namespace PIMS.Application.Interfaces.UsersAccess;

public interface IUserStoreAssignmentService
{
    Task<IReadOnlyList<UserStoreAssignmentResponse>> GetByUserIdAsync(
        int userId,
        CancellationToken cancellationToken = default);

    Task<UserStoreAssignmentResponse> AssignAsync(
        int userId,
        AssignUserStoreRequest request,
        CancellationToken cancellationToken = default);

    Task SetDefaultAsync(
        int userId,
        int storeId,
        CancellationToken cancellationToken = default);

    Task RemoveAsync(
        int userId,
        int storeId,
        CancellationToken cancellationToken = default);
}