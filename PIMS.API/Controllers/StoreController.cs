using Microsoft.AspNetCore.Mvc;
using PIMS.Application.DTOs.Stores;
using PIMS.Application.Interfaces;

namespace PIMS.API.Controllers;

[ApiController]
[Route("api/stores")]
public class StoreController : ControllerBase
{
    private readonly IStoreService _storeService;

    public StoreController(IStoreService storeService)
    {
        _storeService = storeService;
    }

    // GET: api/stores
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<StoreResponse>>> GetAll(
        [FromQuery] bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var stores = await _storeService.GetAllAsync(
            includeInactive,
            cancellationToken);

        return Ok(stores);
    }

    // GET: api/stores/{id}
    [HttpGet("{id:int}")]
    public async Task<ActionResult<StoreResponse>> GetById(
        int id,
        CancellationToken cancellationToken = default)
    {
        var store = await _storeService.GetByIdAsync(
            id,
            cancellationToken);

        if (store is null)
            return NotFound(new
            {
                message = "Store not found."
            });

        return Ok(store);
    }

    // POST: api/stores
    [HttpPost]
    public async Task<ActionResult<StoreResponse>> Create(
        [FromBody] CreateStoreRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var store = await _storeService.CreateAsync(
                request,
                cancellationToken);

            return CreatedAtAction(
                nameof(GetById),
                new { id = store.Id },
                store);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new
            {
                message = ex.Message
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }

    // PUT: api/stores/{id}
    [HttpPut("{id:int}")]
    public async Task<ActionResult<StoreResponse>> Update(
        int id,
        [FromBody] UpdateStoreRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var store = await _storeService.UpdateAsync(
                id,
                request,
                cancellationToken);

            return Ok(store);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new
            {
                message = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new
            {
                message = ex.Message
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }

    // PATCH: api/stores/{id}/deactivate
    [HttpPatch("{id:int}/deactivate")]
    public async Task<IActionResult> Deactivate(
        int id,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await _storeService.DeactivateAsync(
                id,
                cancellationToken);

            return Ok(new
            {
                message = "Store deactivated successfully."
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new
            {
                message = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new
            {
                message = ex.Message
            });
        }
    }

    // GET: api/stores/{storeId}/locations
    [HttpGet("{storeId:int}/locations")]
    public async Task<ActionResult<IReadOnlyList<StoreLocationResponse>>> GetLocations(
        int storeId,
        [FromQuery] bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var locations = await _storeService.GetLocationsAsync(
                storeId,
                includeInactive,
                cancellationToken);

            return Ok(locations);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new
            {
                message = ex.Message
            });
        }
    }

    // POST: api/stores/{storeId}/locations
    [HttpPost("{storeId:int}/locations")]
    public async Task<ActionResult<StoreLocationResponse>> CreateLocation(
        int storeId,
        [FromBody] CreateStoreLocationRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var location = await _storeService.CreateLocationAsync(
                storeId,
                request,
                cancellationToken);

            return Ok(location);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new
            {
                message = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new
            {
                message = ex.Message
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }

    // PUT: api/stores/{storeId}/locations/{locationId}
    [HttpPut("{storeId:int}/locations/{locationId:int}")]
    public async Task<ActionResult<StoreLocationResponse>> UpdateLocation(
        int storeId,
        int locationId,
        [FromBody] UpdateStoreLocationRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var location = await _storeService.UpdateLocationAsync(
                storeId,
                locationId,
                request,
                cancellationToken);

            return Ok(location);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new
            {
                message = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new
            {
                message = ex.Message
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }

    // PATCH: api/stores/{storeId}/locations/{locationId}/deactivate
    [HttpPatch("{storeId:int}/locations/{locationId:int}/deactivate")]
    public async Task<IActionResult> DeactivateLocation(
        int storeId,
        int locationId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await _storeService.DeactivateLocationAsync(
                storeId,
                locationId,
                cancellationToken);

            return Ok(new
            {
                message = "Store location deactivated successfully."
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new
            {
                message = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new
            {
                message = ex.Message
            });
        }
    }
}