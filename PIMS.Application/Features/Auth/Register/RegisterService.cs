using PIMS.Application.Common;
using PIMS.Application.DTOs.Auth;
using PIMS.Application.Interfaces;
using PIMS.Application.Interfaces.Auth;
using PIMS.Domain.Entities.Auth;

namespace PIMS.Application.Features.Auth.Register;

public class RegisterService
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordService _passwordService;
    private readonly IUnitOfWork _unitOfWork;

    public RegisterService(
        IUserRepository userRepository,
        IPasswordService passwordService,
        IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;
        _passwordService = passwordService;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<AuthResponse>> RegisterAsync(
        RegisterRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request == null)
        {
            return Result<AuthResponse>.Failure(
                "Registration request is required.");
        }

        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return Result<AuthResponse>.Failure(
                "Full name is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Username))
        {
            return Result<AuthResponse>.Failure(
                "Username is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return Result<AuthResponse>.Failure(
                "Email is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            return Result<AuthResponse>.Failure(
                "Password is required.");
        }

        if (request.Password.Length < 8)
        {
            return Result<AuthResponse>.Failure(
                "Password must be at least 8 characters.");
        }

        var username =
            request.Username.Trim();

        var email =
            request.Email.Trim().ToLowerInvariant();

        if (await _userRepository.ExistsByUsernameAsync(
                username,
                cancellationToken))
        {
            return Result<AuthResponse>.Failure(
                "Username is already in use.");
        }

        if (await _userRepository.ExistsByEmailAsync(
                email,
                cancellationToken))
        {
            return Result<AuthResponse>.Failure(
                "Email is already in use.");
        }

        var user = new User(
            request.FullName,
            username,
            email);

        var passwordHash =
            _passwordService.HashPassword(
                request.Password);

        user.SetPasswordHash(passwordHash);

        await _userRepository.AddAsync(
    user,
    cancellationToken);

        await _unitOfWork.SaveChangesAsync(
            cancellationToken);

        var departmentUserRoleId =
            await _userRepository.GetRoleIdByNameAsync(
                "DepartmentUser",
                cancellationToken);

        if (!departmentUserRoleId.HasValue)
        {
            return Result<AuthResponse>.Failure(
                "Default DepartmentUser role was not found.");
        }

        user.AssignRole(
            departmentUserRoleId.Value);

        await _unitOfWork.SaveChangesAsync(
            cancellationToken);

        var response = new AuthResponse
        {
            UserId = user.Id,
            FullName = user.FullName,
            Username = user.Username,
            Email = user.Email
        };

        return Result<AuthResponse>.Success(response);
    }
}