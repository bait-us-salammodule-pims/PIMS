using Microsoft.EntityFrameworkCore;
using PIMS.Application.DTOs.UsersAccess;
using PIMS.Application.Interfaces.Auth;
using PIMS.Application.Interfaces.UsersAccess;
using PIMS.Domain.Entities.Auth;
using PIMS.Infrastructure.Persistence;

namespace PIMS.Infrastructure.Services.UsersAccess;

public class UserManagementService : IUserManagementService
{
    private readonly PimsDbContext _db;
    private readonly IPasswordService _passwordService;

    public UserManagementService(
        PimsDbContext db,
        IPasswordService passwordService)
    {
        _db = db;
        _passwordService = passwordService;
    }

    public async Task<UserResponse> CreateAsync(
        CreateUserRequest request,
        CancellationToken cancellationToken = default)
    {
        var usernameExists = await _db.Users
            .AnyAsync(
                x => x.Username == request.Username,
                cancellationToken);

        if (usernameExists)
            throw new InvalidOperationException(
                "Username already exists.");

        var emailExists = await _db.Users
            .AnyAsync(
                x => x.Email == request.Email.ToLower(),
                cancellationToken);

        if (emailExists)
            throw new InvalidOperationException(
                "Email already exists.");

        var user = new User(
            request.FullName,
            request.Username,
            request.Email);

        var passwordHash =
            _passwordService.HashPassword(request.Password);

        user.SetPasswordHash(passwordHash);

        user.AssignScope(
            request.BranchId,
            request.DepartmentId,
            request.StoreId);

        _db.Users.Add(user);

        await _db.SaveChangesAsync(cancellationToken);

        return Map(user);
    }

    public async Task<UserResponse?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var user = await _db.Users
            .Include(x => x.UserRoles)
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        return user == null ? null : Map(user);
    }

    public async Task<IReadOnlyList<UserResponse>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        var users = await _db.Users
            .Include(x => x.UserRoles)
            .AsNoTracking()
            .OrderBy(x => x.FullName)
            .ToListAsync(cancellationToken);

        return users
            .Select(Map)
            .ToList();
    }

    public async Task<UserResponse> UpdateAsync(
        int id,
        UpdateUserRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await _db.Users
            .Include(x => x.UserRoles)
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        if (user == null)
            throw new KeyNotFoundException(
                "User not found.");

        var emailExists = await _db.Users
            .AnyAsync(
                x => x.Id != id &&
                     x.Email == request.Email.ToLower(),
                cancellationToken);

        if (emailExists)
            throw new InvalidOperationException(
                "Email already exists.");

        user.UpdateProfile(
            request.FullName,
            request.Email);

        user.AssignScope(
            request.BranchId,
            request.DepartmentId,
            request.StoreId);

        await _db.SaveChangesAsync(cancellationToken);

        return Map(user);
    }

    public async Task AssignRoleAsync(
        int userId,
        int roleId,
        CancellationToken cancellationToken = default)
    {
        var user = await _db.Users
            .Include(x => x.UserRoles)
            .FirstOrDefaultAsync(
                x => x.Id == userId,
                cancellationToken);

        if (user == null)
            throw new KeyNotFoundException(
                "User not found.");

        var roleExists = await _db.Roles
            .AnyAsync(
                x => x.Id == roleId,
                cancellationToken);

        if (!roleExists)
            throw new KeyNotFoundException(
                "Role not found.");

        user.AssignRole(roleId);

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task ActivateAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        if (user == null)
            throw new KeyNotFoundException(
                "User not found.");

        user.Activate();

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task DeactivateAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        if (user == null)
            throw new KeyNotFoundException(
                "User not found.");

        user.Deactivate();

        await _db.SaveChangesAsync(cancellationToken);
    }

    private static UserResponse Map(User user)
    {
        return new UserResponse(
            user.Id,
            user.FullName,
            user.Username,
            user.Email,
            user.IsActive,
            user.BranchId,
            user.DepartmentId,
            user.StoreId,
            user.UserRoles
                .Select(x => x.RoleId)
                .ToList());
    }
}