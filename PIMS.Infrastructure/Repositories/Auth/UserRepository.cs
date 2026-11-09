using Microsoft.EntityFrameworkCore;
using PIMS.Application.Interfaces.Auth;
using PIMS.Domain.Entities.Auth;
using PIMS.Infrastructure.Persistence;

namespace PIMS.Infrastructure.Repositories.Auth;

public class UserRepository : IUserRepository
{
    private readonly PimsDbContext _context;

    public UserRepository(PimsDbContext context)
    {
        _context = context;
    }

    public async Task<User?> GetByIdAsync(
        int userId,
        CancellationToken cancellationToken = default)
    {
        return await _context.Users
            .Include(x => x.UserRoles)
                .ThenInclude(x => x.Role)
                    .ThenInclude(x => x.RolePermissions)
                        .ThenInclude(x => x.Permission)
            .Include(x => x.StoreAccesses)
            .FirstOrDefaultAsync(
                x => x.Id == userId,
                cancellationToken);
    }

    public async Task<User?> GetByUsernameOrEmailAsync(
        string usernameOrEmail,
        CancellationToken cancellationToken = default)
    {
        var value = usernameOrEmail
            .Trim()
            .ToLowerInvariant();

        return await _context.Users
            .Include(x => x.UserRoles)
                .ThenInclude(x => x.Role)
                    .ThenInclude(x => x.RolePermissions)
                        .ThenInclude(x => x.Permission)
            .Include(x => x.StoreAccesses)
            .FirstOrDefaultAsync(
                x =>
                    x.Username.ToLower() == value ||
                    x.Email.ToLower() == value,
                cancellationToken);
    }

    public async Task<bool> ExistsByUsernameAsync(
        string username,
        CancellationToken cancellationToken = default)
    {
        var value = username
            .Trim()
            .ToLowerInvariant();

        return await _context.Users
            .AnyAsync(
                x => x.Username.ToLower() == value,
                cancellationToken);
    }

    public async Task<bool> ExistsByEmailAsync(
        string email,
        CancellationToken cancellationToken = default)
    {
        var value = email
            .Trim()
            .ToLowerInvariant();

        return await _context.Users
            .AnyAsync(
                x => x.Email.ToLower() == value,
                cancellationToken);
    }

    public async Task AddAsync(
        User user,
        CancellationToken cancellationToken = default)
    {
        await _context.Users.AddAsync(
            user,
            cancellationToken);
    }

    public async Task<int?> GetRoleIdByNameAsync(
    string roleName,
    CancellationToken cancellationToken = default)
    {
        var role = await _context.Roles
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.Name == roleName && x.IsActive,
                cancellationToken);

        return role?.Id;
    }
}