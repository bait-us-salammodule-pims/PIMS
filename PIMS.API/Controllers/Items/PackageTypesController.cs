
using Microsoft.AspNetCore.Mvc;
using PIMS.Application.DTOs.Items;
using PIMS.Application.Interfaces.Items;

namespace PIMS.API.Controllers.Items;

[ApiController]
[Route("api/package-types")]
public sealed class PackageTypesController : ControllerBase
{
    private readonly IPackageTypeService _packageTypeService;

    public PackageTypesController(IPackageTypeService packageTypeService)
    {
        _packageTypeService = packageTypeService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PackageTypeDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        var packageTypes = await _packageTypeService.GetAllAsync(cancellationToken);
        return Ok(packageTypes);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PackageTypeDto>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var packageType = await _packageTypeService.GetByIdAsync(
            id, cancellationToken);

        if (packageType is null)
            return NotFound(new { message = "Package type not found." });

        return Ok(packageType);
    }

    [HttpPost]
    public async Task<ActionResult<PackageTypeDto>> Create(
        [FromBody] CreatePackageTypeDto request,
        CancellationToken cancellationToken)
    {
        var packageType = await _packageTypeService.CreateAsync(
            request, cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { id = packageType.Id },
            packageType);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<PackageTypeDto>> Update(
        int id,
        [FromBody] UpdatePackageTypeDto request,
        CancellationToken cancellationToken)
    {
        var packageType = await _packageTypeService.UpdateAsync(
            id, request, cancellationToken);

        if (packageType is null)
            return NotFound(new { message = "Package type not found." });

        return Ok(packageType);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(
        int id,
        CancellationToken cancellationToken)
    {
        var deleted = await _packageTypeService.DeleteAsync(
            id, cancellationToken);

        if (!deleted)
            return NotFound(new { message = "Package type not found." });

        return NoContent();
    }
}
