using PIMS.API.Authorization;

using Microsoft.AspNetCore.Mvc;
using PIMS.Application.Interfaces.UsersAccess;

namespace PIMS.API.Controllers.UsersAccess;

[ApiController]
[Route("api/roles/{roleId:int}/permissions")]
public class RolePermissionController : ControllerBase
{
    private readonly IRolePermissionService _service;

    public RolePermissionController(IRolePermissionService service)
    {
        _service = service;
    }

    [HttpGet]
    [HasPermission("RoleView")]
    public async Task<IActionResult> GetByRoleId(
        int roleId,
        CancellationToken cancellationToken)
    {
        var result = await _service.GetByRoleIdAsync(
            roleId,
            cancellationToken);

        return Ok(result);
    }

    [HttpPost("{permissionId:int}")]
    [HasPermission("PermissionManage")]
    public async Task<IActionResult> Assign(
        int roleId,
        int permissionId,
        CancellationToken cancellationToken)
    {
        var result = await _service.AssignAsync(
            roleId,
            permissionId,
            cancellationToken);

        return Ok(result);
    }

    [HttpDelete("{permissionId:int}")]
    [HasPermission("PermissionManage")]
    public async Task<IActionResult> Remove(
        int roleId,
        int permissionId,
        CancellationToken cancellationToken)
    {
        await _service.RemoveAsync(
            roleId,
            permissionId,
            cancellationToken);

        return NoContent();
    }
}
