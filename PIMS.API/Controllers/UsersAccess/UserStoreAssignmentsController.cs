using PIMS.API.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIMS.Application.DTOs.UsersAccess;
using PIMS.Application.Interfaces.UsersAccess;

namespace PIMS.API.Controllers.UsersAccess;

[ApiController]
[Route("api/users/{userId:int}/stores")]
public class UserStoreAssignmentsController : ControllerBase
{
    private readonly IUserStoreAssignmentService _service;

    public UserStoreAssignmentsController(
        IUserStoreAssignmentService service)
    {
        _service = service;
    }

    [HttpGet]
    [HasPermission("StoreView")]
    public async Task<IActionResult> GetByUserId(
        int userId,
        CancellationToken cancellationToken)
    {
        return Ok(await _service.GetByUserIdAsync(
            userId,
            cancellationToken));
    }

    [HttpPost]
    [HasPermission("StoreManage")]
    public async Task<IActionResult> Assign(
        int userId,
        AssignUserStoreRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.AssignAsync(
            userId,
            request,
            cancellationToken);

        return Ok(result);
    }

    [HttpPut("{storeId:int}/default")]
    [HasPermission("StoreManage")]
    public async Task<IActionResult> SetDefault(
        int userId,
        int storeId,
        CancellationToken cancellationToken)
    {
        await _service.SetDefaultAsync(
            userId,
            storeId,
            cancellationToken);

        return NoContent();
    }

    [HttpDelete("{storeId:int}")]
    [HasPermission("StoreManage")]
    public async Task<IActionResult> Remove(
        int userId,
        int storeId,
        CancellationToken cancellationToken)
    {
        await _service.RemoveAsync(
            userId,
            storeId,
            cancellationToken);

        return NoContent();
    }
}