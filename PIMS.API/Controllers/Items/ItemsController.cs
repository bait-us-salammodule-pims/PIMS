
using Microsoft.AspNetCore.Mvc;
using PIMS.Application.DTOs.Items;
using PIMS.Application.Interfaces.Items;

namespace PIMS.API.Controllers.Items;

[ApiController]
[Route("api/items")]
public sealed class ItemsController : ControllerBase
{
    private readonly IItemService _service;

    public ItemsController(IItemService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ItemDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        var items = await _service.GetAllAsync(cancellationToken);
        return Ok(items);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ItemDto>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var item = await _service.GetByIdAsync(id, cancellationToken);

        if (item is null)
            return NotFound(new { message = "Item not found." });

        return Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<ItemDto>> Create(
        [FromBody] CreateItemDto request,
        CancellationToken cancellationToken)
    {
        var item = await _service.CreateAsync(request, cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { id = item.Id },
            item);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ItemDto>> Update(
        int id,
        [FromBody] UpdateItemDto request,
        CancellationToken cancellationToken)
    {
        var item = await _service.UpdateAsync(id, request, cancellationToken);

        if (item is null)
            return NotFound(new { message = "Item not found." });

        return Ok(item);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(
        int id,
        CancellationToken cancellationToken)
    {
        var deleted = await _service.DeleteAsync(id, cancellationToken);

        if (!deleted)
            return NotFound(new { message = "Item not found." });

        return NoContent();
    }
}
