using PIMS.Application.DTOs.UsersAccess;

namespace PIMS.Application.Interfaces.UsersAccess;

public interface IRoleTabAccessService
{
    Task<IReadOnlyList<RoleTabAccessDto>> GetByRoleIdAsync(
        int roleId,
        CancellationToken cancellationToken = default);

    Task<RoleTabAccessDto> AssignAsync(
        int roleId,
        AssignRoleTabAccessDto request,
        CancellationToken cancellationToken = default);

    Task RemoveAsync(
        int roleId,
        int tabId,
        CancellationToken cancellationToken = default);
}