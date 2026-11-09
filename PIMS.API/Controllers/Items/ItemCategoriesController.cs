using Microsoft.AspNetCore.Mvc;
using PIMS.Application.DTOs.Items;
using PIMS.Application.Interfaces.Items;

namespace PIMS.API.Controllers.Items;

[ApiController]
[Route("api/item-categories")]
public sealed class ItemCategoriesController : ControllerBase
{
    private readonly IItemCategoryService _service;

    public ItemCategoriesController(IItemCategoryService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ItemCategoryDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        var categories = await _service.GetAllAsync(cancellationToken);
        return Ok(categories);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ItemCategoryDto>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var category = await _service.GetByIdAsync(id, cancellationToken);

        if (category is null)
            return NotFound(new { message = "Item category not found." });

        return Ok(category);
    }

    [HttpPost]
    public async Task<ActionResult<ItemCategoryDto>> Create(
        [FromBody] CreateItemCategoryDto request,
        CancellationToken cancellationToken)
    {
        var category = await _service.CreateAsync(request, cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { id = category.Id },
            category);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ItemCategoryDto>> Update(
        int id,
        [FromBody] UpdateItemCategoryDto request,
        CancellationToken cancellationToken)
    {
        var category = await _service.UpdateAsync(
            id, request, cancellationToken);

        if (category is null)
            return NotFound(new { message = "Item category not found." });

        return Ok(category);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(
        int id,
        CancellationToken cancellationToken)
    {
        var deleted = await _service.DeleteAsync(id, cancellationToken);

        if (!deleted)
            return NotFound(new { message = "Item category not found." });

        return NoContent();
    }
}