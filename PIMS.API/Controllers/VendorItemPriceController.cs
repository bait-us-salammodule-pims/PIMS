
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIMS.Application.DTOs.Vendors;
using PIMS.Application.Interfaces.Vendors;

namespace PIMS.API.Controllers;

[ApiController]
[Route("api/vendors/{vendorId:int}/item-prices")]
[Authorize]
public class VendorItemPriceController : ControllerBase
{
    private readonly IVendorItemPriceService _service;

    public VendorItemPriceController(IVendorItemPriceService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        int vendorId, CancellationToken cancellationToken)
    {
        var prices = await _service.GetAllAsync(vendorId, cancellationToken);
        return Ok(prices);
    }

    [HttpGet("{priceId:int}")]
    public async Task<IActionResult> GetById(
        int vendorId, int priceId, CancellationToken cancellationToken)
    {
        var price = await _service.GetByIdAsync(
            vendorId, priceId, cancellationToken);

        if (price is null)
            return NotFound(new { message = "Vendor item price not found." });

        return Ok(price);
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        int vendorId,
        [FromBody] CreateVendorItemPriceDto request,
        CancellationToken cancellationToken)
    {
        var price = await _service.CreateAsync(
            vendorId, request, cancellationToken);

        if (price is null)
            return NotFound(new { message = "Vendor not found." });

        return CreatedAtAction(
            nameof(GetById),
            new { vendorId, priceId = price.Id },
            price);
    }

    [HttpPut("{priceId:int}")]
    public async Task<IActionResult> Update(
        int vendorId,
        int priceId,
        [FromBody] UpdateVendorItemPriceDto request,
        CancellationToken cancellationToken)
    {
        var price = await _service.UpdateAsync(
            vendorId, priceId, request, cancellationToken);

        if (price is null)
            return NotFound(new { message = "Vendor item price not found." });

        return Ok(price);
    }

    [HttpPatch("{priceId:int}/deactivate")]
    public async Task<IActionResult> Deactivate(
        int vendorId, int priceId, CancellationToken cancellationToken)
    {
        var result = await _service.DeactivateAsync(
            vendorId, priceId, cancellationToken);

        if (!result)
            return NotFound(new { message = "Vendor item price not found." });

        return Ok(new { message = "Vendor item price deactivated successfully." });
    }

    [HttpPatch("{priceId:int}/activate")]
    public async Task<IActionResult> Activate(
        int vendorId, int priceId, CancellationToken cancellationToken)
    {
        var result = await _service.ActivateAsync(
            vendorId, priceId, cancellationToken);

        if (!result)
            return NotFound(new { message = "Vendor item price not found." });

        return Ok(new { message = "Vendor item price activated successfully." });
    }
}
