using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PIMS.Application.DTOs.Auth;
using PIMS.Application.Features.Auth.Login;
using PIMS.Application.Features.Auth.Me;
using PIMS.Application.Features.Auth.Register;

namespace PIMS.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly RegisterService _registerService;
    private readonly LoginService _loginService;
    private readonly MeService _meService;

    public AuthController(
        RegisterService registerService,
        LoginService loginService,
        MeService meService)
    {
        _registerService = registerService;
        _loginService = loginService;
        _meService = meService;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register(
        [FromBody] RegisterRequest request,
        CancellationToken cancellationToken)
    {
        var result =
            await _registerService.RegisterAsync(
                request,
                cancellationToken);

        if (!result.IsSuccess)
        {
            return BadRequest(new
            {
                success = false,
                error = result.Error
            });
        }

        return StatusCode(
            StatusCodes.Status201Created,
            new
            {
                success = true,
                data = result.Value
            });
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        var result =
            await _loginService.LoginAsync(
                request,
                cancellationToken);

        if (!result.IsSuccess)
        {
            return Unauthorized(new
            {
                success = false,
                error = result.Error
            });
        }

        return Ok(new
        {
            success = true,
            data = result.Value
        });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me(
        CancellationToken cancellationToken)
    {
        var result =
            await _meService.GetCurrentUserAsync(
                cancellationToken);

        if (!result.IsSuccess)
        {
            return Unauthorized(new
            {
                success = false,
                error = result.Error
            });
        }

        return Ok(new
        {
            success = true,
            data = result.Value
        });
    }
}