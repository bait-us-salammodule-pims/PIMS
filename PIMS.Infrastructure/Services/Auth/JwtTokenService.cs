using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using PIMS.Application.Interfaces.Auth;
using PIMS.Domain.Entities.Auth;

namespace PIMS.Infrastructure.Services.Auth;

public class JwtTokenService : IJwtTokenService
{
    private readonly IConfiguration _configuration;

    public JwtTokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public Task<(string Token, DateTime ExpiresAt)> GenerateTokenAsync(
        User user,
        CancellationToken cancellationToken = default)
    {
        var key = _configuration["Jwt:Key"];

        if (string.IsNullOrWhiteSpace(key))
        {
            throw new InvalidOperationException(
                "JWT key is not configured.");
        }

        var issuer =
            _configuration["Jwt:Issuer"] ?? "PIMS";

        var audience =
            _configuration["Jwt:Audience"] ?? "PIMS.Client";

        var expirationMinutes =
            int.TryParse(
                _configuration["Jwt:ExpirationMinutes"],
                out var minutes)
                ? minutes
                : 60;

        var expiresAt =
            DateTime.UtcNow.AddMinutes(expirationMinutes);

        var claims = new List<Claim>
        {
            new(
                JwtRegisteredClaimNames.Sub,
                user.Id.ToString()),

            new(
                ClaimTypes.NameIdentifier,
                user.Id.ToString()),

            new(
                ClaimTypes.Name,
                user.Username),

            new(
                ClaimTypes.Email,
                user.Email)
        };

        foreach (var userRole in user.UserRoles)
        {
            if (!userRole.Role.IsActive)
                continue;

            claims.Add(
                new Claim(
                    ClaimTypes.Role,
                    userRole.Role.Name));

            foreach (var rolePermission
                     in userRole.Role.RolePermissions)
            {
                if (!rolePermission.Permission.IsActive)
                    continue;

                claims.Add(
                    new Claim(
                        "permission",
                        rolePermission.Permission.Code));
            }
        }

        if (user.BranchId.HasValue)
        {
            claims.Add(
                new Claim(
                    "branchId",
                    user.BranchId.Value.ToString()));
        }

        if (user.DepartmentId.HasValue)
        {
            claims.Add(
                new Claim(
                    "departmentId",
                    user.DepartmentId.Value.ToString()));
        }

        if (user.StoreId.HasValue)
        {
            claims.Add(
                new Claim(
                    "storeId",
                    user.StoreId.Value.ToString()));
        }

        var securityKey =
            new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(key));

        var credentials =
            new SigningCredentials(
                securityKey,
                SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials);

        var tokenString =
            new JwtSecurityTokenHandler()
                .WriteToken(token);

        return Task.FromResult(
            (tokenString, expiresAt));
    }
}