using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIMS.Application.DTOs.Organization;
using PIMS.Application.Features.Organization;

namespace PIMS.API.Controllers.Organization;

[ApiController]
[Route("api/organization/sub-departments")]
[Authorize]
public class SubDepartmentsController : ControllerBase
{
    private readonly SubDepartmentService _service;

    public SubDepartmentsController(SubDepartmentService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? departmentId = null,
        [FromQuery] bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var result = await _service.GetAllAsync(
            departmentId,
            includeInactive,
            cancellationToken);

        return Ok(result);
    }

    [HttpGet("{id:int}")]
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
                message = "Sub-department not found."
            });
        }

        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] SubDepartmentDto dto,
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
    public async Task<IActionResult> Update(
        int id,
        [FromBody] SubDepartmentDto dto,
        CancellationToken cancellationToken = default)
    {
        var result = await _service.UpdateAsync(
            id,
            dto,
            cancellationToken);

        if (!result.IsSuccess)
        {
            if (result.Error == "Sub-department not found.")
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
    public async Task<IActionResult> Deactivate(
        int id,
        CancellationToken cancellationToken = default)
    {
        var result = await _service.DeactivateAsync(
            id,
            cancellationToken);

        if (!result.IsSuccess)
        {
            if (result.Error == "Sub-department not found.")
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
    public async Task<IActionResult> Activate(
        int id,
        CancellationToken cancellationToken = default)
    {
        var result = await _service.ActivateAsync(
            id,
            cancellationToken);

        if (!result.IsSuccess)
        {
            if (result.Error == "Sub-department not found.")
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