using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using PIMS.Application.DependencyInjection;
using PIMS.Infrastructure;
using PIMS.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

// Application and Infrastructure
builder.Services.AddApplication();

builder.Services.AddInfrastructure(
    builder.Configuration);

// JWT configuration
var jwtKey = builder.Configuration["Jwt:Key"];

if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException(
        "JWT key is not configured.");
}

var jwtIssuer =
    builder.Configuration["Jwt:Issuer"] ?? "PIMS";

var jwtAudience =
    builder.Configuration["Jwt:Audience"] ?? "PIMS.Client";

// Authentication
builder.Services
    .AddAuthentication(
        JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,

                ValidIssuer = jwtIssuer,
                ValidAudience = jwtAudience,

                IssuerSigningKey =
                    new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(jwtKey)),

                ClockSkew = TimeSpan.Zero
            };
    });

// Authorization: require authentication by default
builder.Services.AddSingleton<Microsoft.AspNetCore.Authorization.IAuthorizationPolicyProvider, PIMS.API.Authorization.PermissionPolicyProvider>();
builder.Services.AddScoped<Microsoft.AspNetCore.Authorization.IAuthorizationHandler, PIMS.API.Authorization.PermissionAuthorizationHandler>();

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy =
        new AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser()
            .Build();
});

// Controllers and OpenAPI
builder.Services.AddControllers();

builder.Services.AddOpenApi();

var app = builder.Build();

// Global exception handling
app.UseMiddleware<PIMS.API.Middleware.GlobalExceptionMiddleware>();

// Seed authentication data
using (var scope = app.Services.CreateScope())
{
    var dbContext =
        scope.ServiceProvider
            .GetRequiredService<PimsDbContext>();

    await AuthDataSeeder.SeedAsync(dbContext);
}

// OpenAPI in Development
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// HTTP pipeline
app.UseHttpsRedirection();

app.UseAuthentication();

app.UseAuthorization();

app.MapControllers();

app.Run();