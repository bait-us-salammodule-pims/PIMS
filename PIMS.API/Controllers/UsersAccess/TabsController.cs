using PIMS.API.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIMS.Application.DTOs.UsersAccess;
using PIMS.Application.Interfaces.UsersAccess;

namespace PIMS.API.Controllers.UsersAccess;

[ApiController]
[Route("api/tabs")]
public class TabsController : ControllerBase
{
    private readonly ITabService _service;

    public TabsController(ITabService service)
    {
        _service = service;
    }

    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [HasPermission("SystemConfigurationView")]
    public async Task<IActionResult> GetAll(
        CancellationToken cancellationToken)
    {
        var tabs = await _service.GetAllAsync(cancellationToken);

        return Ok(tabs);
    }

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [HasPermission("SystemConfigurationManage")]
    public async Task<IActionResult> Create(
        [FromBody] CreateTabDto request,
        CancellationToken cancellationToken)
    {
        var result = await _service.CreateAsync(
            request,
            cancellationToken);

        return Ok(result);
    }
}