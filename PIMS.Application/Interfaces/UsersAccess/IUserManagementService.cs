using PIMS.Application.DTOs.UsersAccess;

namespace PIMS.Application.Interfaces.UsersAccess;

public interface IUserManagementService
{
    Task<UserResponse> CreateAsync(
        CreateUserRequest request,
        CancellationToken cancellationToken = default);

    Task<UserResponse?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<UserResponse>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<UserResponse> UpdateAsync(
        int id,
        UpdateUserRequest request,
        CancellationToken cancellationToken = default);

    Task AssignRoleAsync(
        int userId,
        int roleId,
        CancellationToken cancellationToken = default);

    Task ActivateAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task DeactivateAsync(
        int id,
        CancellationToken cancellationToken = default);
}