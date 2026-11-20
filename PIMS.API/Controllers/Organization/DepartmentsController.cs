using Microsoft.AspNetCore.Authorization;
using PIMS.API.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIMS.Application.DTOs.Organization;
using PIMS.Application.Features.Organization;

namespace PIMS.API.Controllers.Organization;

[ApiController]
[Route("api/organization/departments")]
[Authorize]
public class DepartmentsController : ControllerBase
{
    private readonly DepartmentService _service;

    public DepartmentsController(DepartmentService service)
    {
        _service = service;
    }

    [HttpGet]
    [HasPermission("OrganizationView")]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? branchId = null,
        [FromQuery] bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var result = await _service.GetAllAsync(
            branchId,
            includeInactive,
            cancellationToken);

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    [HasPermission("OrganizationView")]
    public async Task<IActionResult> GetById(
        int id,
        CancellationToken cancellationToken = default)
    {
        var result = await _service.GetByIdAsync(
            id,
            cancellationToken);

        if (result == null)
        {
            return NotFound(new
            {
                message = "Department not found."
            });
        }

        return Ok(result);
    }

    [HttpPost]
    [HasPermission("OrganizationManage")]
    public async Task<IActionResult> Create(
        [FromBody] DepartmentDto dto,
        CancellationToken cancellationToken = default)
    {
        var result = await _service.CreateAsync(
            dto,
            cancellationToken);

        if (!result.IsSuccess)
        {
            return BadRequest(new
            {
                message = result.Error
            });
        }

        return CreatedAtAction(
            nameof(GetById),
            new { id = result.Value!.Id },
            result.Value);
    }

    [HttpPut("{id:int}")]
    [HasPermission("OrganizationManage")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] DepartmentDto dto,
        CancellationToken cancellationToken = default)
    {
        var result = await _service.UpdateAsync(
            id,
            dto,
            cancellationToken);

        if (!result.IsSuccess)
        {
            if (result.Error == "Department not found.")
            {
                return NotFound(new
                {
                    message = result.Error
                });
            }

            return BadRequest(new
            {
                message = result.Error
            });
        }

        return Ok(result.Value);
    }

    [HttpPatch("{id:int}/deactivate")]
    [HasPermission("OrganizationManage")]
    public async Task<IActionResult> Deactivate(
        int id,
        CancellationToken cancellationToken = default)
    {
        var result = await _service.DeactivateAsync(
            id,
            cancellationToken);

        if (!result.IsSuccess)
        {
            if (result.Error == "Department not found.")
            {
                return NotFound(new
                {
                    message = result.Error
                });
            }

            return BadRequest(new
            {
                message = result.Error
            });
        }

        return NoContent();
    }

    [HttpPatch("{id:int}/activate")]
    [HasPermission("OrganizationManage")]
    public async Task<IActionResult> Activate(
        int id,
        CancellationToken cancellationToken = default)
    {
        var result = await _service.ActivateAsync(
            id,
            cancellationToken);

        if (!result.IsSuccess)
        {
            if (result.Error == "Department not found.")
            {
                return NotFound(new
                {
                    message = result.Error
                });
            }

            return BadRequest(new
            {
                message = result.Error
            });
        }

        return NoContent();
    }
}