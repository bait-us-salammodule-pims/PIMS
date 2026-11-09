using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using PIMS.Application.Interfaces;

namespace PIMS.Infrastructure.Services.Auth;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(
        IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private ClaimsPrincipal? User =>
        _httpContextAccessor.HttpContext?.User;

    public int? UserId =>
        GetIntClaim(ClaimTypes.NameIdentifier);

    public string? Role =>
        User?.FindFirstValue(ClaimTypes.Role);

    public int? BranchId =>
        GetIntClaim("branchId");

    public int? DepartmentId =>
        GetIntClaim("departmentId");

    public int? StoreId =>
        GetIntClaim("storeId");

    private int? GetIntClaim(string claimType)
    {
        var value = User?.FindFirstValue(claimType);

        if (int.TryParse(value, out var result))
        {
            return result;
        }

        return null;
    }
}