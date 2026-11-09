using Microsoft.Extensions.DependencyInjection;

using PIMS.Application.Features.Auth.Login;
using PIMS.Application.Features.Auth.Me;
using PIMS.Application.Features.Auth.Register;

using PIMS.Application.Features.Organization;

namespace PIMS.Application.DependencyInjection;

public static class ApplicationServiceRegistration
{
    public static IServiceCollection AddApplication(
        this IServiceCollection services)
    {
        // Auth services
        services.AddScoped<RegisterService>();
        services.AddScoped<LoginService>();
        services.AddScoped<MeService>();

        // Organization services
        services.AddScoped<HeadOfficeService>();
        services.AddScoped<BranchService>();
        services.AddScoped<DepartmentService>();
        services.AddScoped<SubDepartmentService>();

        return services;
    }
}