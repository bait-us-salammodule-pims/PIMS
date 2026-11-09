using PIMS.API.Authorization;

using Microsoft.AspNetCore.Mvc;
using PIMS.Application.DTOs.UsersAccess;
using PIMS.Application.Interfaces.UsersAccess;

namespace PIMS.API.Controllers.UsersAccess;

[ApiController]
[Route("api/roles")]
public class RolesController : ControllerBase
{
    private readonly IRoleManagementService _service;

    public RolesController(IRoleManagementService service)
    {
        _service = service;
    }

    [HttpGet]
    [HasPermission("RoleView")]
    public async Task<IActionResult> GetAll(
        CancellationToken cancellationToken)
    {
        var result = await _service.GetAllAsync(
            cancellationToken);

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    [HasPermission("RoleView")]
    public async Task<IActionResult> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var result = await _service.GetByIdAsync(
            id,
            cancellationToken);

        if (result is null)
            return NotFound(new { message = "Role not found." });

        return Ok(result);
    }

    [HttpPost]
    [HasPermission("RoleCreate")]
    public async Task<IActionResult> Create(
        [FromBody] CreateRoleRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.CreateAsync(
            request,
            cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { id = result.Id },
            result);
    }

    [HttpPut("{id:int}")]
    [HasPermission("RoleUpdate")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] UpdateRoleRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.UpdateAsync(
            id,
            request,
            cancellationToken);

        return Ok(result);
    }

    [HttpPatch("{id:int}/activate")]
    [HasPermission("RoleUpdate")]
    public async Task<IActionResult> Activate(
        int id,
        CancellationToken cancellationToken)
    {
        await _service.ActivateAsync(id, cancellationToken);

        return NoContent();
    }

    [HttpPatch("{id:int}/deactivate")]
    [HasPermission("RoleUpdate")]
    public async Task<IActionResult> Deactivate(
        int id,
        CancellationToken cancellationToken)
    {
        await _service.DeactivateAsync(id, cancellationToken);

        return NoContent();
    }
}
