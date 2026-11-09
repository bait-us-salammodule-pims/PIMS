using Microsoft.AspNetCore.Authorization;

namespace PIMS.API.Authorization;

public sealed class HasPermissionAttribute : AuthorizeAttribute
{
    public HasPermissionAttribute(string permission)
    {
        Policy = $"{PermissionPolicyProvider.Prefix}{permission}";
    }
}
