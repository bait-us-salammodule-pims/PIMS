
using Microsoft.AspNetCore.Mvc;
using PIMS.Application.DTOs.Items;
using PIMS.Application.Interfaces.Items;

namespace PIMS.API.Controllers.Items;

[ApiController]
[Route("api/units-of-measure")]
public sealed class UnitsOfMeasureController : ControllerBase
{
    private readonly IUnitOfMeasureService _service;

    public UnitsOfMeasureController(IUnitOfMeasureService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UnitOfMeasureDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        var units = await _service.GetAllAsync(cancellationToken);
        return Ok(units);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<UnitOfMeasureDto>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var unit = await _service.GetByIdAsync(id, cancellationToken);

        if (unit is null)
            return NotFound(new { message = "Unit of measure not found." });

        return Ok(unit);
    }

    [HttpPost]
    public async Task<ActionResult<UnitOfMeasureDto>> Create(
        [FromBody] CreateUnitOfMeasureDto request,
        CancellationToken cancellationToken)
    {
        var unit = await _service.CreateAsync(request, cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { id = unit.Id },
            unit);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<UnitOfMeasureDto>> Update(
        int id,
        [FromBody] UpdateUnitOfMeasureDto request,
        CancellationToken cancellationToken)
    {
        var unit = await _service.UpdateAsync(
            id, request, cancellationToken);

        if (unit is null)
            return NotFound(new { message = "Unit of measure not found." });

        return Ok(unit);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(
        int id,
        CancellationToken cancellationToken)
    {
        var deleted = await _service.DeleteAsync(id, cancellationToken);

        if (!deleted)
            return NotFound(new { message = "Unit of measure not found." });

        return NoContent();
    }
}