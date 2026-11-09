using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIMS.Application.DTOs.Vendors;
using PIMS.Application.Interfaces.Vendors;

namespace PIMS.API.Controllers;

[ApiController]
[Route("api/vendors/{vendorId:int}/contacts")]
[Authorize]
public class VendorContactController : ControllerBase
{
    private readonly IVendorContactService _contactService;

    public VendorContactController(
        IVendorContactService contactService)
    {
        _contactService = contactService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        int vendorId,
        CancellationToken cancellationToken)
    {
        var contacts = await _contactService.GetAllAsync(
            vendorId, cancellationToken);

        return Ok(contacts);
    }

    [HttpGet("{contactId:int}")]
    public async Task<IActionResult> GetById(
        int vendorId,
        int contactId,
        CancellationToken cancellationToken)
    {
        var contact = await _contactService.GetByIdAsync(
            vendorId, contactId, cancellationToken);

        if (contact is null)
            return NotFound(new { message = "Vendor contact not found." });

        return Ok(contact);
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        int vendorId,
        [FromBody] CreateVendorContactDto request,
        CancellationToken cancellationToken)
    {
        var contact = await _contactService.CreateAsync(
            vendorId, request, cancellationToken);

        if (contact is null)
            return NotFound(new { message = "Vendor not found." });

        return CreatedAtAction(
            nameof(GetById),
            new { vendorId, contactId = contact.Id },
            contact);
    }

    [HttpPut("{contactId:int}")]
    public async Task<IActionResult> Update(
        int vendorId,
        int contactId,
        [FromBody] UpdateVendorContactDto request,
        CancellationToken cancellationToken)
    {
        var contact = await _contactService.UpdateAsync(
            vendorId, contactId, request, cancellationToken);

        if (contact is null)
            return NotFound(new { message = "Vendor contact not found." });

        return Ok(contact);
    }

    [HttpPatch("{contactId:int}/deactivate")]
    public async Task<IActionResult> Deactivate(
        int vendorId,
        int contactId,
        CancellationToken cancellationToken)
    {
        var result = await _contactService.DeactivateAsync(
            vendorId, contactId, cancellationToken);

        if (!result)
            return NotFound(new { message = "Vendor contact not found." });

        return Ok(new { message = "Vendor contact deactivated successfully." });
    }

    [HttpPatch("{contactId:int}/activate")]
    public async Task<IActionResult> Activate(
        int vendorId,
        int contactId,
        CancellationToken cancellationToken)
    {
        var result = await _contactService.ActivateAsync(
            vendorId, contactId, cancellationToken);

        if (!result)
            return NotFound(new { message = "Vendor contact not found." });

        return Ok(new { message = "Vendor contact activated successfully." });
    }
}