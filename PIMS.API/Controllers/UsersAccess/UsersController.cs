using Microsoft.AspNetCore.Mvc;
using PIMS.API.Authorization;
using PIMS.Application.DTOs.UsersAccess;
using PIMS.Application.Interfaces.UsersAccess;

namespace PIMS.API.Controllers.UsersAccess;

[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly IUserManagementService _service;

    public UsersController(IUserManagementService service)
    {
        _service = service;
    }

    [HttpPost]
    [HasPermission("UserCreate")]
    public async Task<IActionResult> Create(
        CreateUserRequest request,
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
    [HasPermission("UserView")]
    public async Task<IActionResult> GetAll(
        CancellationToken cancellationToken)
    {
        return Ok(
            await _service.GetAllAsync(cancellationToken));
    }

    [HttpGet("{id:int}")]
    [HasPermission("UserView")]
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

    [HttpPut("{id:int}")]
    [HasPermission("UserUpdate")]
    public async Task<IActionResult> Update(
        int id,
        UpdateUserRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(
            await _service.UpdateAsync(
                id,
                request,
                cancellationToken));
    }

    [HttpPost("{id:int}/roles")]
    [HasPermission("RoleUpdate")]
    public async Task<IActionResult> AssignRole(
        int id,
        AssignUserRoleRequest request,
        CancellationToken cancellationToken)
    {
        await _service.AssignRoleAsync(
            id,
            request.RoleId,
            cancellationToken);

        return NoContent();
    }

    [HttpPost("{id:int}/activate")]
    [HasPermission("UserUpdate")]
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
    [HasPermission("UserDeactivate")]
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