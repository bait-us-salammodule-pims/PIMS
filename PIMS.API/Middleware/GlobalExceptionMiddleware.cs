using System.Text.Json;

namespace PIMS.API.Middleware;

public sealed class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception exception)
        {
            _logger.LogError(
                exception,
                "Unhandled exception while processing {Method} {Path}",
                context.Request.Method,
                context.Request.Path);

            if (context.Response.HasStarted)
            {
                throw;
            }

            context.Response.Clear();
            context.Response.ContentType = "application/json";

            var (statusCode, title, message) = exception switch
            {
                KeyNotFoundException =>
                    (
                        StatusCodes.Status404NotFound,
                        "Resource not found",
                        exception.Message
                    ),

                ArgumentException =>
                    (
                        StatusCodes.Status400BadRequest,
                        "Invalid request",
                        exception.Message
                    ),

                InvalidOperationException =>
                    (
                        StatusCodes.Status400BadRequest,
                        "Invalid operation",
                        exception.Message
                    ),

                UnauthorizedAccessException =>
                    (
                        StatusCodes.Status403Forbidden,
                        "Forbidden",
                        "You are not allowed to perform this action."
                    ),

                _ =>
                    (
                        StatusCodes.Status500InternalServerError,
                        "An unexpected error occurred",
                        "An internal server error occurred."
                    )
            };

            context.Response.StatusCode = statusCode;

            var response = new
            {
                status = statusCode,
                title,
                message,
                traceId = context.TraceIdentifier
            };

            await context.Response.WriteAsync(
                JsonSerializer.Serialize(response));
        }
    }
}