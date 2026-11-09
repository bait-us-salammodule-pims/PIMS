using PIMS.Application.Common;
using PIMS.Application.DTOs.Auth;
using PIMS.Application.Interfaces.Auth;

namespace PIMS.Application.Features.Auth.Login;

public class LoginService
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordService _passwordService;
    private readonly IJwtTokenService _jwtTokenService;

    public LoginService(
        IUserRepository userRepository,
        IPasswordService passwordService,
        IJwtTokenService jwtTokenService)
    {
        _userRepository = userRepository;
        _passwordService = passwordService;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<Result<AuthResponse>> LoginAsync(
        LoginRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request == null)
        {
            return Result<AuthResponse>.Failure(
                "Login request is required.");
        }

        if (string.IsNullOrWhiteSpace(request.UsernameOrEmail))
        {
            return Result<AuthResponse>.Failure(
                "Username or email is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            return Result<AuthResponse>.Failure(
                "Password is required.");
        }

        var user =
            await _userRepository.GetByUsernameOrEmailAsync(
                request.UsernameOrEmail,
                cancellationToken);

        if (user == null)
        {
            return Result<AuthResponse>.Failure(
                "Invalid username/email or password.");
        }

        if (!user.IsActive)
        {
            return Result<AuthResponse>.Failure(
                "User account is inactive.");
        }

        var passwordValid =
            _passwordService.VerifyPassword(
                user.PasswordHash,
                request.Password);

        if (!passwordValid)
        {
            return Result<AuthResponse>.Failure(
                "Invalid username/email or password.");
        }

        var (token, expiresAt) =
            await _jwtTokenService.GenerateTokenAsync(
                user,
                cancellationToken);

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

        var response = new AuthResponse
        {
            UserId = user.Id,
            FullName = user.FullName,
            Username = user.Username,
            Email = user.Email,
            Roles = roles,
            Permissions = permissions,
            Token = token,
            ExpiresAt = expiresAt
        };

        return Result<AuthResponse>.Success(response);
    }
}