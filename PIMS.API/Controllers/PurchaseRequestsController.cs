
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIMS.Application.DTOs.Procurement;
using PIMS.Application.Interfaces.Procurement;

namespace PIMS.API.Controllers;

[ApiController]
[Route("api/purchase-requests")]
[Authorize]
public sealed class PurchaseRequestsController : ControllerBase
{
    private readonly IPurchaseRequestService _service;

    public PurchaseRequestsController(IPurchaseRequestService service)
    {
        _service = service;
    }

    [HttpPost]
    [ProducesResponseType(typeof(PurchaseRequestResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<PurchaseRequestResponseDto>> Create(
        [FromBody] CreatePurchaseRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await _service.CreateAsync(request, cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { id = result.Id },
            result);
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<PurchaseRequestResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<PurchaseRequestResponseDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        var result = await _service.GetAllAsync(cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(PurchaseRequestResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PurchaseRequestResponseDto>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var result = await _service.GetByIdAsync(id, cancellationToken);
        return Ok(result);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<PurchaseRequestResponseDto>> Update(
        int id,
        [FromBody] UpdatePurchaseRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await _service.UpdateAsync(id, request, cancellationToken);
        return Ok(result);
    }

    [HttpPost("{id:int}/items")]
    public async Task<ActionResult<PurchaseRequestItemResponseDto>> AddItem(
        int id,
        [FromBody] CreatePurchaseRequestItemDto request,
        CancellationToken cancellationToken)
    {
        var result = await _service.AddItemAsync(id, request, cancellationToken);
        return Ok(result);
    }

    [HttpPut("{id:int}/items/{itemId:int}")]
    public async Task<ActionResult<PurchaseRequestItemResponseDto>> UpdateItem(
        int id,
        int itemId,
        [FromBody] UpdatePurchaseRequestItemDto request,
        CancellationToken cancellationToken)
    {
        var result = await _service.UpdateItemAsync(
            id, itemId, request, cancellationToken);

        return Ok(result);
    }

    [HttpDelete("{id:int}/items/{itemId:int}")]
    public async Task<IActionResult> RemoveItem(
        int id,
        int itemId,
        CancellationToken cancellationToken)
    {
        await _service.RemoveItemAsync(id, itemId, cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:int}/submit")]
    public async Task<ActionResult<PurchaseRequestResponseDto>> Submit(
        int id,
        CancellationToken cancellationToken)
    {
        var result = await _service.SubmitAsync(id, cancellationToken);
        return Ok(result);
    }

    [HttpPost("{id:int}/start-review")]
    public async Task<ActionResult<PurchaseRequestResponseDto>> StartReview(
        int id,
        CancellationToken cancellationToken)
    {
        var result = await _service.StartReviewAsync(
            id, cancellationToken);

        return Ok(result);
    }

    [HttpPost("{id:int}/approve")]
    public async Task<ActionResult<PurchaseRequestResponseDto>> Approve(
        int id,
        CancellationToken cancellationToken)
    {
        var result = await _service.ApproveAsync(
            id, cancellationToken);

        return Ok(result);
    }

    [HttpPost("{id:int}/reject")]
    public async Task<ActionResult<PurchaseRequestResponseDto>> Reject(
        int id,
        CancellationToken cancellationToken)
    {
        var result = await _service.RejectAsync(
            id, cancellationToken);

        return Ok(result);
    }

    [HttpPost("{id:int}/cancel")]
    public async Task<ActionResult<PurchaseRequestResponseDto>> Cancel(
        int id,
        CancellationToken cancellationToken)
    {
        var result = await _service.CancelAsync(id, cancellationToken);
        return Ok(result);
    }
}
    