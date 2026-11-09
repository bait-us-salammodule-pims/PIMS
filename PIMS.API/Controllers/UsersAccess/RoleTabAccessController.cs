using PIMS.API.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIMS.Application.DTOs.UsersAccess;
using PIMS.Application.Interfaces.UsersAccess;

namespace PIMS.API.Controllers.UsersAccess;

[ApiController]
[Route("api/roles/{roleId:int}/tabs")]
public class RoleTabAccessController : ControllerBase
{
    private readonly IRoleTabAccessService _service;

    public RoleTabAccessController(
        IRoleTabAccessService service)
    {
        _service = service;
    }

    [HttpGet]
    [HasPermission("RoleView")]
    public async Task<IActionResult> GetByRoleId(
        int roleId,
        CancellationToken cancellationToken)
    {
        return Ok(
            await _service.GetByRoleIdAsync(
                roleId,
                cancellationToken));
    }

    [HttpPost]
    [HasPermission("RoleUpdate")]
    public async Task<IActionResult> Assign(
        int roleId,
        AssignRoleTabAccessDto request,
        CancellationToken cancellationToken)
    {
        var result = await _service.AssignAsync(
            roleId,
            request,
            cancellationToken);

        return Ok(result);
    }

    [HttpDelete("{tabId:int}")]
    [HasPermission("RoleUpdate")]
    public async Task<IActionResult> Remove(
        int roleId,
        int tabId,
        CancellationToken cancellationToken)
    {
        await _service.RemoveAsync(
            roleId,
            tabId,
            cancellationToken);

        return NoContent();
    }
}