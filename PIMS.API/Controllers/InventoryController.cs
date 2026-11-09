
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIMS.Application.DTOs.Inventory;
using PIMS.Application.Interfaces.Inventory;

namespace PIMS.API.Controllers;

[ApiController]
[Route("api/inventory")]
[Authorize]
public sealed class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventoryService;

    public InventoryController(IInventoryService inventoryService)
    {
        _inventoryService = inventoryService;
    }

    [HttpGet("balances")]
    public async Task<ActionResult<IReadOnlyList<InventoryBalanceResponseDto>>> GetBalances(
        [FromQuery] int? storeId,
        [FromQuery] int? itemId,
        CancellationToken cancellationToken)
    {
        return Ok(await _inventoryService.GetBalancesAsync(
            storeId, itemId, cancellationToken));
    }

    [HttpGet("balances/{storeId:int}/{itemId:int}")]
    public async Task<ActionResult<InventoryBalanceResponseDto>> GetBalance(
        int storeId,
        int itemId,
        CancellationToken cancellationToken)
    {
        var balance = await _inventoryService.GetBalanceAsync(
            storeId, itemId, cancellationToken);

        if (balance is null)
            return NotFound();

        return Ok(balance);
    }

    [HttpGet("movements")]
    public async Task<ActionResult<IReadOnlyList<StockMovementResponseDto>>> GetMovements(
        [FromQuery] int? storeId,
        [FromQuery] int? itemId,
        CancellationToken cancellationToken)
    {
        return Ok(await _inventoryService.GetMovementsAsync(
            storeId, itemId, cancellationToken));
    }

    [HttpPost("adjustments/increase")]
    public async Task<ActionResult<StockMovementResponseDto>> IncreaseStock(
        [FromBody] StockAdjustmentDto request,
        CancellationToken cancellationToken)
    {
        return Ok(await _inventoryService.AdjustStockAsync(
            request, increase: true, cancellationToken));
    }

    [HttpPost("adjustments/decrease")]
    public async Task<ActionResult<StockMovementResponseDto>> DecreaseStock(
        [FromBody] StockAdjustmentDto request,
        CancellationToken cancellationToken)
    {
        return Ok(await _inventoryService.AdjustStockAsync(
            request, increase: false, cancellationToken));
    }

    [HttpPost("reservations")]
    public async Task<ActionResult<InventoryBalanceResponseDto>> ReserveStock(
        [FromBody] StockReservationDto request,
        CancellationToken cancellationToken)
    {
        return Ok(await _inventoryService.ReserveStockAsync(
            request, cancellationToken));
    }

    [HttpPost("reservations/release")]
    public async Task<ActionResult<InventoryBalanceResponseDto>> ReleaseReservation(
        [FromBody] StockReservationDto request,
        CancellationToken cancellationToken)
    {
        return Ok(await _inventoryService.ReleaseReservationAsync(
            request, cancellationToken));
    }
}
