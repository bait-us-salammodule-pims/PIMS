
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIMS.Application.DTOs.Procurement;
using PIMS.Application.Interfaces.Procurement;

namespace PIMS.API.Controllers;

[ApiController]
[Route("api/goods-receipts")]
[Authorize]
public sealed class GoodsReceiptsController : ControllerBase
{
    private readonly IGoodsReceiptService _goodsReceiptService;

    public GoodsReceiptsController(IGoodsReceiptService goodsReceiptService)
    {
        _goodsReceiptService = goodsReceiptService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<GoodsReceiptResponseDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        var receipts = await _goodsReceiptService.GetAllAsync(cancellationToken);
        return Ok(receipts);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<GoodsReceiptResponseDto>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var receipt = await _goodsReceiptService.GetByIdAsync(id, cancellationToken);

        if (receipt is null)
            return NotFound();

        return Ok(receipt);
    }

    [HttpPost]
    public async Task<ActionResult<GoodsReceiptResponseDto>> Create(
        [FromBody] CreateGoodsReceiptDto request,
        CancellationToken cancellationToken)
    {
        var receipt = await _goodsReceiptService.CreateAsync(request, cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { id = receipt.Id },
            receipt);
    }

    [HttpPost("{id:int}/submit")]
    public async Task<ActionResult<GoodsReceiptResponseDto>> Submit(
        int id,
        CancellationToken cancellationToken)
    {
        return Ok(await _goodsReceiptService.SubmitAsync(id, cancellationToken));
    }

    [HttpPost("{id:int}/inspect")]
    public async Task<ActionResult<GoodsReceiptResponseDto>> Inspect(
        int id,
        CancellationToken cancellationToken)
    {
        return Ok(await _goodsReceiptService.InspectAsync(id, cancellationToken));
    }

    [HttpPost("{id:int}/record-inspection-result")]
    public async Task<ActionResult<GoodsReceiptResponseDto>> RecordInspectionResult(
        int id,
        CancellationToken cancellationToken)
    {
        return Ok(await _goodsReceiptService.RecordInspectionResultAsync(
            id, cancellationToken));
    }

    [HttpPost("{id:int}/cancel")]
    public async Task<ActionResult<GoodsReceiptResponseDto>> Cancel(
        int id,
        CancellationToken cancellationToken)
    {
        return Ok(await _goodsReceiptService.CancelAsync(id, cancellationToken));
    }

    [HttpPost("{id:int}/post-to-inventory")]
    public async Task<ActionResult<GoodsReceiptResponseDto>> PostToInventory(
    int id,
    CancellationToken cancellationToken)
    {
        var receipt = await _goodsReceiptService.PostToInventoryAsync(
            id,
            cancellationToken);

        return Ok(receipt);
    }
}
