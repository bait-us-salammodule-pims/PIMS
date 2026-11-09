using Microsoft.AspNetCore.Identity;
using PIMS.Application.Interfaces.Auth;
using PIMS.Domain.Entities.Auth;

namespace PIMS.Infrastructure.Services.Auth;

public class PasswordService : IPasswordService
{
    private readonly PasswordHasher<User> _passwordHasher;

    public PasswordService()
    {
        _passwordHasher = new PasswordHasher<User>();
    }

    public string HashPassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password))
        {
            throw new ArgumentException(
                "Password is required.");
        }

        return _passwordHasher.HashPassword(
            null!,
            password);
    }

    public bool VerifyPassword(
        string hashedPassword,
        string providedPassword)
    {
        if (string.IsNullOrWhiteSpace(hashedPassword) ||
            string.IsNullOrWhiteSpace(providedPassword))
        {
            return false;
        }

        var result =
            _passwordHasher.VerifyHashedPassword(
                null!,
                hashedPassword,
                providedPassword);

        return result == PasswordVerificationResult.Success ||
               result == PasswordVerificationResult.SuccessRehashNeeded;
    }
}