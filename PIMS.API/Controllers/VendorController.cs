using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIMS.Application.DTOs.Vendors;
using PIMS.Application.Interfaces.Vendors;

namespace PIMS.API.Controllers;

[ApiController]
[Route("api/vendors")]
[Authorize]
public class VendorController : ControllerBase
{
    private readonly IVendorService _vendorService;

    public VendorController(IVendorService vendorService)
    {
        _vendorService = vendorService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        CancellationToken cancellationToken)
    {
        var vendors = await _vendorService.GetAllAsync(cancellationToken);
        return Ok(vendors);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var vendor = await _vendorService.GetByIdAsync(
            id, cancellationToken);

        if (vendor is null)
            return NotFound(new { message = "Vendor not found." });

        return Ok(vendor);
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateVendorDto request,
        CancellationToken cancellationToken)
    {
        var vendor = await _vendorService.CreateAsync(
            request, cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { id = vendor.Id },
            vendor);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] UpdateVendorDto request,
        CancellationToken cancellationToken)
    {
        var vendor = await _vendorService.UpdateAsync(
            id, request, cancellationToken);

        if (vendor is null)
            return NotFound(new { message = "Vendor not found." });

        return Ok(vendor);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(
        int id,
        CancellationToken cancellationToken)
    {
        var deleted = await _vendorService.DeleteAsync(
            id, cancellationToken);

        if (!deleted)
            return NotFound(new { message = "Vendor not found." });

        return Ok(new { message = "Vendor deactivated successfully." });
    }

    [HttpPatch("{id:int}/activate")]
    public async Task<IActionResult> Activate(
    int id,
    CancellationToken cancellationToken)
    {
        var result = await _vendorService.ActivateAsync(
            id, cancellationToken);

        if (!result)
            return NotFound(new { message = "Vendor not found." });

        return Ok(new { message = "Vendor activated successfully." });
    }

    [HttpPatch("{id:int}/approve")]
    public async Task<IActionResult> Approve(
    int id,
    CancellationToken cancellationToken)
    {
        var result = await _vendorService.ApproveAsync(
            id, cancellationToken);

        if (!result)
            return NotFound(new { message = "Vendor not found." });

        return Ok(new { message = "Vendor approved successfully." });
    }

    [HttpPatch("{id:int}/block")]
    public async Task<IActionResult> Block(
        int id,
        CancellationToken cancellationToken)
    {
        var result = await _vendorService.BlockAsync(
            id, cancellationToken);

        if (!result)
            return NotFound(new { message = "Vendor not found." });

        return Ok(new { message = "Vendor blocked successfully." });
    }
}