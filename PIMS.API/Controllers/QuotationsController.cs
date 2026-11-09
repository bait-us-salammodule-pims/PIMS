
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIMS.Application.DTOs.Procurement;
using PIMS.Application.Interfaces.Procurement;

namespace PIMS.API.Controllers;

[ApiController]
[Route("api/quotations")]
[Authorize]
public sealed class QuotationsController : ControllerBase
{
    private readonly IQuotationService _quotationService;

    public QuotationsController(IQuotationService quotationService)
    {
        _quotationService = quotationService;
    }

    [HttpPost]
    public async Task<ActionResult<QuotationRequestResponseDto>> Create(
        CreateQuotationRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await _quotationService.CreateAsync(
            request, cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { id = result.Id },
            result);
    }

    [HttpGet]
    public async Task<ActionResult<List<QuotationRequestResponseDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        return Ok(await _quotationService.GetAllAsync(cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<QuotationRequestResponseDto>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var result = await _quotationService.GetByIdAsync(
            id, cancellationToken);

        if (result is null)
            return NotFound(new { message = "Quotation request not found." });

        return Ok(result);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<QuotationRequestResponseDto>> Update(
        int id,
        UpdateQuotationRequestDto request,
        CancellationToken cancellationToken)
    {
        return Ok(await _quotationService.UpdateAsync(
            id, request, cancellationToken));
    }

    [HttpPost("{id:int}/send-to-vendors")]
    public async Task<ActionResult<QuotationRequestResponseDto>> SendToVendors(
        int id,
        CancellationToken cancellationToken)
    {
        return Ok(await _quotationService.SendToVendorsAsync(
            id, cancellationToken));
    }

    [HttpPost("{id:int}/vendor-quotations")]
    public async Task<ActionResult<VendorQuotationResponseDto>> AddVendorQuotation(
        int id,
        CreateVendorQuotationDto request,
        CancellationToken cancellationToken)
    {
        var result = await _quotationService.AddVendorQuotationAsync(
            id, request, cancellationToken);

        return Ok(result);
    }

    [HttpPost("{id:int}/responses-received")]
    public async Task<ActionResult<QuotationRequestResponseDto>> MarkResponsesReceived(
        int id,
        CancellationToken cancellationToken)
    {
        return Ok(await _quotationService.MarkResponsesReceivedAsync(
            id, cancellationToken));
    }

    [HttpPost("{id:int}/start-comparison")]
    public async Task<ActionResult<QuotationRequestResponseDto>> StartComparison(
        int id,
        CancellationToken cancellationToken)
    {
        return Ok(await _quotationService.StartComparisonAsync(
            id, cancellationToken));
    }

    [HttpGet("{id:int}/comparison")]
    public async Task<ActionResult<List<QuotationComparisonItemDto>>> Compare(
        int id,
        CancellationToken cancellationToken)
    {
        return Ok(await _quotationService.CompareAsync(
            id, cancellationToken));
    }

    [HttpPost("{id:int}/vendor-quotations/{vendorQuotationId:int}/select")]
    public async Task<ActionResult<QuotationRequestResponseDto>> SelectVendorQuotation(
        int id,
        int vendorQuotationId,
        CancellationToken cancellationToken)
    {
        return Ok(await _quotationService.SelectVendorQuotationAsync(
            id, vendorQuotationId, cancellationToken));
    }

    [HttpPost("{id:int}/cancel")]
    public async Task<ActionResult<QuotationRequestResponseDto>> Cancel(
        int id,
        CancellationToken cancellationToken)
    {
        return Ok(await _quotationService.CancelAsync(
            id, cancellationToken));
    }
}
