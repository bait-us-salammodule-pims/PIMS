using Microsoft.AspNetCore.Mvc;
using PIMS.Application.DTOs.Items;
using PIMS.Application.Interfaces.Items;

namespace PIMS.API.Controllers.Items;

[ApiController]
[Route("api/item-pricing")]
public sealed class ItemPricingController : ControllerBase
{
    private readonly IItemPricingService _itemPricingService;

    public ItemPricingController(IItemPricingService itemPricingService)
    {
        _itemPricingService = itemPricingService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ItemPricingDto>>> GetAll(
        [FromQuery] int? itemId,
        CancellationToken cancellationToken)
    {
        var records = await _itemPricingService.GetAllAsync(
            itemId,
            cancellationToken);

        return Ok(records);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ItemPricingDto>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var record = await _itemPricingService.GetByIdAsync(
            id,
            cancellationToken);

        if (record is null)
        {
            return NotFound(new
            {
                message = "Item pricing not found."
            });
        }

        return Ok(record);
    }

    [HttpPost]
    public async Task<ActionResult<ItemPricingDto>> Create(
        [FromBody] CreateItemPricingDto request,
        CancellationToken cancellationToken)
    {
        var record = await _itemPricingService.CreateAsync(
            request,
            cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { id = record.Id },
            record);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ItemPricingDto>> Update(
        int id,
        [FromBody] UpdateItemPricingDto request,
        CancellationToken cancellationToken)
    {
        var record = await _itemPricingService.UpdateAsync(
            id,
            request,
            cancellationToken);

        if (record is null)
        {
            return NotFound(new
            {
                message = "Item pricing not found."
            });
        }

        return Ok(record);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(
        int id,
        CancellationToken cancellationToken)
    {
        var deleted = await _itemPricingService.DeleteAsync(
            id,
            cancellationToken);

        if (!deleted)
        {
            return NotFound(new
            {
                message = "Item pricing not found."
            });
        }

        return NoContent();
    }
}