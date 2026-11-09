using PIMS.API.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIMS.Application.DTOs.UsersAccess;
using PIMS.Application.Interfaces.UsersAccess;

namespace PIMS.API.Controllers.UsersAccess;

[ApiController]
[Route("api/permissions")]
public class PermissionsController : ControllerBase
{
    private readonly IPermissionService _service;

    public PermissionsController(IPermissionService service)
    {
        _service = service;
    }

    [HttpPost]
    [HasPermission("PermissionManage")]
    public async Task<IActionResult> Create(
        CreatePermissionRequest request,
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

    [HttpGet]
    [HasPermission("PermissionView")]
    public async Task<IActionResult> GetAll(
        CancellationToken cancellationToken)
    {
        return Ok(
            await _service.GetAllAsync(cancellationToken));
    }

    [HttpGet("{id:int}")]
    [HasPermission("PermissionView")]
    public async Task<IActionResult> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var result = await _service.GetByIdAsync(
            id,
            cancellationToken);

        return result == null
            ? NotFound()
            : Ok(result);
    }

    [HttpPost("{id:int}/activate")]
    [HasPermission("PermissionManage")]
    public async Task<IActionResult> Activate(
        int id,
        CancellationToken cancellationToken)
    {
        await _service.ActivateAsync(
            id,
            cancellationToken);

        return NoContent();
    }

    [HttpPost("{id:int}/deactivate")]
    [HasPermission("PermissionManage")]
    public async Task<IActionResult> Deactivate(
        int id,
        CancellationToken cancellationToken)
    {
        await _service.DeactivateAsync(
            id,
            cancellationToken);

        return NoContent();
    }
}