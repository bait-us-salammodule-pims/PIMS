using PIMS.Application.DTOs.UsersAccess;

namespace PIMS.Application.Interfaces.UsersAccess;

public interface IRoleManagementService
{
    Task<RoleResponse> CreateAsync(
        CreateRoleRequest request,
        CancellationToken cancellationToken = default);

    Task<RoleResponse?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<RoleResponse>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<RoleResponse> UpdateAsync(
        int id,
        UpdateRoleRequest request,
        CancellationToken cancellationToken = default);

    Task ActivateAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task DeactivateAsync(
        int id,
        CancellationToken cancellationToken = default);
}