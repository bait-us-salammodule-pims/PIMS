
using PIMS.Application.DTOs.UsersAccess;

namespace PIMS.Application.Interfaces.UsersAccess;

public interface IRolePermissionService
{
    Task<IReadOnlyList<PermissionResponse>> GetByRoleIdAsync(
        int roleId,
        CancellationToken cancellationToken = default);

    Task<PermissionResponse> AssignAsync(
        int roleId,
        int permissionId,
        CancellationToken cancellationToken = default);

    Task RemoveAsync(
        int roleId,
        int permissionId,
        CancellationToken cancellationToken = default);
}
