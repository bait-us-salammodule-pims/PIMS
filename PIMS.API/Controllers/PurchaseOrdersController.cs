
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIMS.Application.DTOs.Procurement;
using PIMS.Application.Interfaces.Procurement;

namespace PIMS.API.Controllers;

[ApiController]
[Route("api/purchase-orders")]
[Authorize]
public sealed class PurchaseOrdersController : ControllerBase
{
    private readonly IPurchaseOrderService _service;

    public PurchaseOrdersController(IPurchaseOrderService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PurchaseOrderResponseDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        var result = await _service.GetAllAsync(cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PurchaseOrderResponseDto>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var result = await _service.GetByIdAsync(id, cancellationToken);

        if (result is null)
            return NotFound(new { message = "Purchase Order not found." });

        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<PurchaseOrderResponseDto>> Create(
        [FromBody] CreatePurchaseOrderDto request,
        CancellationToken cancellationToken)
    {
        var result = await _service.CreateAsync(request, cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { id = result.Id },
            result);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<PurchaseOrderResponseDto>> Update(
        int id,
        [FromBody] UpdatePurchaseOrderDto request,
        CancellationToken cancellationToken)
    {
        var result = await _service.UpdateAsync(
            id, request, cancellationToken);

        return Ok(result);
    }

    [HttpPost("{id:int}/submit-for-approval")]
    public async Task<ActionResult<PurchaseOrderResponseDto>> SubmitForApproval(
        int id,
        CancellationToken cancellationToken)
    {
        var result = await _service.SubmitForApprovalAsync(
            id, cancellationToken);

        return Ok(result);
    }

    [HttpPost("{id:int}/approve")]
    public async Task<ActionResult<PurchaseOrderResponseDto>> Approve(
        int id,
        CancellationToken cancellationToken)
    {
        var result = await _service.ApproveAsync(
            id, cancellationToken);

        return Ok(result);
    }

    [HttpPost("{id:int}/issue")]
    public async Task<ActionResult<PurchaseOrderResponseDto>> Issue(
        int id,
        CancellationToken cancellationToken)
    {
        var result = await _service.IssueAsync(
            id, cancellationToken);

        return Ok(result);
    }

    [HttpPost("{id:int}/cancel")]
    public async Task<ActionResult<PurchaseOrderResponseDto>> Cancel(
        int id,
        CancellationToken cancellationToken)
    {
        var result = await _service.CancelAsync(
            id, cancellationToken);

        return Ok(result);
    }
}
