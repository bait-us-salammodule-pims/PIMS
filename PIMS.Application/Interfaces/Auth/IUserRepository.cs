using PIMS.Domain.Entities.Auth;

namespace PIMS.Application.Interfaces.Auth;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(
        int userId,
        CancellationToken cancellationToken = default);

    Task<User?> GetByUsernameOrEmailAsync(
        string usernameOrEmail,
        CancellationToken cancellationToken = default);

    Task<bool> ExistsByUsernameAsync(
        string username,
        CancellationToken cancellationToken = default);

    Task<bool> ExistsByEmailAsync(
        string email,
        CancellationToken cancellationToken = default);

    Task AddAsync(
        User user,
        CancellationToken cancellationToken = default);

    Task<int?> GetRoleIdByNameAsync(
    string roleName,
    CancellationToken cancellationToken = default);
}




