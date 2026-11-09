using PIMS.Application.DTOs.UsersAccess;

namespace PIMS.Application.Interfaces.UsersAccess;

public interface IPermissionService
{
    Task<PermissionResponse> CreateAsync(
        CreatePermissionRequest request,
        CancellationToken cancellationToken = default);

    Task<PermissionResponse?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PermissionResponse>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task ActivateAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task DeactivateAsync(
        int id,
        CancellationToken cancellationToken = default);
}