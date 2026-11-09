
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIMS.Application.DTOs.Inventory;
using PIMS.Application.Interfaces.Inventory;

namespace PIMS.API.Controllers;

[ApiController]
[Route("api/stock-transfers")]
[Authorize]
public sealed class StockTransferController : ControllerBase
{
    private readonly IStockTransferService _stockTransferService;

    public StockTransferController(IStockTransferService stockTransferService)
    {
        _stockTransferService = stockTransferService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        CancellationToken cancellationToken)
    {
        var transfers = await _stockTransferService.GetAllAsync(cancellationToken);
        return Ok(transfers);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var transfer = await _stockTransferService.GetByIdAsync(
            id, cancellationToken);

        if (transfer is null)
            return NotFound(new { message = "Stock transfer not found." });

        return Ok(transfer);
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateStockTransferDto request,
        CancellationToken cancellationToken)
    {
        var transfer = await _stockTransferService.CreateAsync(
            request, cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { id = transfer.Id },
            transfer);
    }

    [HttpPost("{id:int}/submit")]
    public async Task<IActionResult> Submit(
        int id,
        CancellationToken cancellationToken)
    {
        var transfer = await _stockTransferService.SubmitAsync(
            id, cancellationToken);

        return Ok(transfer);
    }

    public sealed record ApproveStockTransferDto(string ApprovedBy);

    [HttpPost("{id:int}/approve")]
    public async Task<IActionResult> Approve(
        int id,
        [FromBody] ApproveStockTransferDto request,
        CancellationToken cancellationToken)
    {
        var transfer = await _stockTransferService.ApproveAsync(
            id, request.ApprovedBy, cancellationToken);

        return Ok(transfer);
    }

    [HttpPost("{id:int}/reject")]
    public async Task<IActionResult> Reject(
        int id,
        CancellationToken cancellationToken)
    {
        var transfer = await _stockTransferService.RejectAsync(
            id, cancellationToken);

        return Ok(transfer);
    }

    [HttpPost("{id:int}/dispatch")]
    public async Task<IActionResult> Dispatch(
        int id,
        CancellationToken cancellationToken)
    {
        var transfer = await _stockTransferService.DispatchAsync(
            id, cancellationToken);

        return Ok(transfer);
    }

    [HttpPost("{id:int}/receive")]
    public async Task<IActionResult> Receive(
        int id,
        CancellationToken cancellationToken)
    {
        var transfer = await _stockTransferService.ReceiveAsync(
            id, cancellationToken);

        return Ok(transfer);
    }

    [HttpPost("{id:int}/cancel")]
    public async Task<IActionResult> Cancel(
        int id,
        CancellationToken cancellationToken)
    {
        var transfer = await _stockTransferService.CancelAsync(
            id, cancellationToken);

        return Ok(transfer);
    }

    [HttpPatch("{id:int}/notes")]
    public async Task<IActionResult> UpdateNotes(
        int id,
        [FromBody] UpdateStockTransferNotesDto request,
        CancellationToken cancellationToken)
    {
        var transfer = await _stockTransferService.UpdateNotesAsync(
            id, request, cancellationToken);

        return Ok(transfer);
    }
}
