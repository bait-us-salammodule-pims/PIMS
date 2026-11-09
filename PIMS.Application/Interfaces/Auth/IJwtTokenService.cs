using PIMS.Domain.Entities.Auth;

namespace PIMS.Application.Interfaces.Auth;

public interface IJwtTokenService
{
    Task<(string Token, DateTime ExpiresAt)> GenerateTokenAsync(
        User user,
        CancellationToken cancellationToken = default);
}