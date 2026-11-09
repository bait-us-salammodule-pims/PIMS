using PIMS.Application.Common;
using PIMS.Application.DTOs.Auth;
using PIMS.Application.Interfaces;
using PIMS.Application.Interfaces.Auth;

namespace PIMS.Application.Features.Auth.Me;

public class MeService
{
    private readonly IUserRepository _userRepository;
    private readonly ICurrentUserService _currentUserService;

    public MeService(
        IUserRepository userRepository,
        ICurrentUserService currentUserService)
    {
        _userRepository = userRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<CurrentUserResponse>> GetCurrentUserAsync(
        CancellationToken cancellationToken = default)
    {
        if (!_currentUserService.UserId.HasValue)
        {
            return Result<CurrentUserResponse>.Failure(
                "Authenticated user was not found.");
        }

        var user =
            await _userRepository.GetByIdAsync(
                _currentUserService.UserId.Value,
                cancellationToken);

        if (user == null)
        {
            return Result<CurrentUserResponse>.Failure(
                "User account was not found.");
        }

        if (!user.IsActive)
        {
            return Result<CurrentUserResponse>.Failure(
                "User account is inactive.");
        }

        var roles = user.UserRoles
            .Where(x => x.Role.IsActive)
            .Select(x => x.Role.Name)
            .Distinct()
            .ToList();

        var permissions = user.UserRoles
            .Where(x => x.Role.IsActive)
            .SelectMany(x => x.Role.RolePermissions)
            .Where(x => x.Permission.IsActive)
            .Select(x => x.Permission.Code)
            .Distinct()
            .ToList();

        var response = new CurrentUserResponse
        {
            UserId = user.Id,
            FullName = user.FullName,
            Username = user.Username,
            Email = user.Email,
            Roles = roles,
            Permissions = permissions,
            BranchId = user.BranchId,
            DepartmentId = user.DepartmentId,
            StoreId = user.StoreId
        };

        return Result<CurrentUserResponse>.Success(response);
    }
}