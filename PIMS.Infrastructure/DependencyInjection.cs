using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PIMS.Application.Interfaces;
using PIMS.Application.Interfaces.Auth;
using PIMS.Application.Interfaces.Inventory;
using PIMS.Application.Interfaces.Items;
using PIMS.Application.Interfaces.Organization;
using PIMS.Application.Interfaces.Procurement;
using PIMS.Application.Interfaces.UsersAccess;
using PIMS.Application.Interfaces.Vendors;
using PIMS.Infrastructure.Persistence;
using PIMS.Infrastructure.Repositories.Auth;
using PIMS.Infrastructure.Repositories.Organization;
using PIMS.Infrastructure.Services.Auth;
using PIMS.Infrastructure.Services.Inventory;
using PIMS.Infrastructure.Services.Items;
using PIMS.Infrastructure.Services.Procurement;
using PIMS.Infrastructure.Services.Store;
using PIMS.Infrastructure.Services.UsersAccess;
using PIMS.Infrastructure.Services.Vendors;
using PIMS.Application.Interfaces.Dashboard;
using PIMS.Infrastructure.Services.Dashboard;

namespace PIMS.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString =
            configuration.GetConnectionString("DefaultConnection");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Database connection string 'DefaultConnection' is not configured.");
        }

        services.AddDbContext<PimsDbContext>(options =>
            options.UseNpgsql(connectionString));

        services.AddScoped<IUnitOfWork>(
            sp => sp.GetRequiredService<PimsDbContext>());

        // Auth repositories/services
        services.AddScoped<IUserRepository, UserRepository>();

        services.AddScoped<IPasswordService, PasswordService>();

        services.AddScoped<IJwtTokenService, JwtTokenService>();

        // Current user
        services.AddHttpContextAccessor();

        services.AddScoped<ICurrentUserService, CurrentUserService>();

        // Store Management
        services.AddScoped<IStoreService, StoreService>();
        
        // Organization repositories
        services.AddScoped<IHeadOfficeRepository, HeadOfficeRepository>();

        services.AddScoped<IBranchRepository, BranchRepository>();

        services.AddScoped<IDepartmentRepository, DepartmentRepository>();

        services.AddScoped<ISubDepartmentRepository, SubDepartmentRepository>();

        services.AddScoped<
            IUserManagementService,
            UserManagementService>();

        services.AddScoped<
            IRoleManagementService,
            RoleManagementService>();

        services.AddScoped<
            IPermissionService,
            PermissionService>();

        services.AddScoped<
            ITabService,
            TabService>();

       services.AddScoped<
            IRoleTabAccessService,
            RoleTabAccessService>();

        services.AddScoped<
           IRolePermissionService,
           RolePermissionService>();

	    services.AddScoped<
    	  IUserStoreAssignmentService,
    	  UserStoreAssignmentService>();

        services.AddScoped<
            IItemCategoryService, 
            ItemCategoryService>();

        services.AddScoped<
            IItemService, 
            ItemService>();

        services.AddScoped<
            IUnitOfMeasureService, 
            UnitOfMeasureService>();

        services.AddScoped<
            IPackageTypeService, 
            PackageTypeService>();

        services.AddScoped<
            IItemPricingService, 
            ItemPricingService>();

        services.AddScoped<
            IVendorService, 
            VendorService>();

        services.AddScoped<
            IVendorContactService,
            VendorContactService>();

        services.AddScoped<
            IVendorItemPriceService, 
            VendorItemPriceService>();

        // Procurement
        services.AddScoped<
            IPurchaseRequestService,
            PurchaseRequestService>();

        services.AddScoped<
            IQuotationService,
            QuotationService>();

        services.AddScoped<
            IPurchaseOrderService,
            PurchaseOrderService>();

        services.AddScoped<
            IGoodsReceiptService, 
            GoodsReceiptService>();

        services.AddScoped<
            IInventoryService, 
            InventoryService>();

        services.AddScoped<
            IStockTransferService, 
            StockTransferService>();

        // Dashboard
        services.AddScoped<IDashboardService, DashboardService>();
        return services;
    }
}