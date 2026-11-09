using Microsoft.EntityFrameworkCore;
using PIMS.Domain.Entities.Auth;
using PIMS.Domain.Enums.Auth;

namespace PIMS.Infrastructure.Persistence;

public static class AuthDataSeeder
{
    public static async Task SeedAsync(
        PimsDbContext context,
        CancellationToken cancellationToken = default)
    {
        await SeedPermissionsAsync(
            context,
            cancellationToken);

        await SeedRolesAsync(
            context,
            cancellationToken);

        await SeedRolePermissionsAsync(
            context,
            cancellationToken);
    }

    private static async Task SeedPermissionsAsync(
        PimsDbContext context,
        CancellationToken cancellationToken)
    {
        var existingCodes =
            await context.PermissionDefinitions
                .Select(x => x.Code)
                .ToListAsync(cancellationToken);

        var permissions =
            Enum.GetValues<Permission>()
                .Select(permission => new
                {
                    permission,
                    Code = permission.ToString()
                })
                .Where(x =>
                    !existingCodes.Contains(x.Code))
                .Select(x =>
                {
                    var permission = x.permission;

                    var name =
                        CreatePermissionName(permission);

                    var module =
                        CreatePermissionModule(permission);

                    return new PermissionDefinition(
                        x.Code,
                        name,
                        module);
                })
                .ToList();

        if (permissions.Count == 0)
            return;

        await context.PermissionDefinitions.AddRangeAsync(
            permissions,
            cancellationToken);

        await context.SaveChangesAsync(
            cancellationToken);
    }

    private static async Task SeedRolesAsync(
        PimsDbContext context,
        CancellationToken cancellationToken)
    {
        var roles = new[]
        {
            new
            {
                Name = "SuperAdmin",
                Description = "Full system access."
            },
            new
            {
                Name = "Admin",
                Description = "Administrative system access."
            },
            new
            {
                Name = "ProcurementManager",
                Description = "Procurement management access."
            },
            new
            {
                Name = "DepartmentManager",
                Description = "Department management access."
            },
            new
            {
                Name = "StoreManager",
                Description = "Store management access."
            },
            new
            {
                Name = "FinanceManager",
                Description = "Finance management access."
            },
            new
            {
                Name = "ProcurementOfficer",
                Description = "Procurement operational access."
            },
            new
            {
                Name = "StoreOfficer",
                Description = "Store operational access."
            },
            new
            {
                Name = "FinanceOfficer",
                Description = "Finance operational access."
            },
            new
            {
                Name = "DepartmentUser",
                Description = "Department user access."
            }
        };

        var existingRoleNames =
            await context.Roles
                .Select(x => x.Name)
                .ToListAsync(cancellationToken);

        var newRoles = roles
            .Where(x =>
                !existingRoleNames.Contains(x.Name))
            .Select(x =>
                new Role(
                    x.Name,
                    x.Description))
            .ToList();

        if (newRoles.Count == 0)
            return;

        await context.Roles.AddRangeAsync(
            newRoles,
            cancellationToken);

        await context.SaveChangesAsync(
            cancellationToken);
    }

    private static async Task SeedRolePermissionsAsync(
        PimsDbContext context,
        CancellationToken cancellationToken)
    {
        var roles =
            await context.Roles
                .Include(x => x.RolePermissions)
                .ToListAsync(cancellationToken);

        var permissions =
            await context.PermissionDefinitions
                .ToListAsync(cancellationToken);

        var existingMappings =
            await context.RolePermissions
                .Select(x => new
                {
                    x.RoleId,
                    x.PermissionId
                })
                .ToListAsync(cancellationToken);

        var mappings = new List<RolePermission>();

        foreach (var role in roles)
        {
            IEnumerable<PermissionDefinition> allowedPermissions;

            if (role.Name == "SuperAdmin")
            {
                allowedPermissions = permissions;
            }
            else if (role.Name == "Admin")
            {
                allowedPermissions = permissions;
            }
            else if (role.Name == "ProcurementManager")
            {
                allowedPermissions = permissions.Where(
                    x =>
                        x.Module == "PurchaseRequest" ||
                        x.Module == "Approval" ||
                        x.Module == "Quotation" ||
                        x.Module == "QuotationComparison" ||
                        x.Module == "PurchaseOrder" ||
                        x.Module == "Vendor");
            }
            else if (role.Name == "DepartmentManager")
            {
                allowedPermissions = permissions.Where(
                    x =>
                        x.Module == "Dashboard" ||
                        x.Module == "PurchaseRequest" ||
                        x.Module == "Approval");
            }
            else if (role.Name == "StoreManager")
            {
                allowedPermissions = permissions.Where(
                    x =>
                        x.Module == "Dashboard" ||
                        x.Module == "Store" ||
                        x.Module == "Receiving" ||
                        x.Module == "Inventory");
            }
            else if (role.Name == "FinanceManager")
            {
                allowedPermissions = permissions.Where(
                    x =>
                        x.Module == "Dashboard" ||
                        x.Module == "Finance" ||
                        x.Module == "Reports");
            }
            else if (role.Name == "ProcurementOfficer")
            {
                allowedPermissions = permissions.Where(
                    x =>
                        x.Module == "Dashboard" ||
                        x.Module == "PurchaseRequest" ||
                        x.Module == "Quotation" ||
                        x.Module == "QuotationComparison" ||
                        x.Module == "PurchaseOrder" ||
                        x.Module == "Vendor");
            }
            else if (role.Name == "StoreOfficer")
            {
                allowedPermissions = permissions.Where(
                    x =>
                        x.Module == "Dashboard" ||
                        x.Module == "Receiving" ||
                        x.Module == "Inventory");
            }
            else if (role.Name == "FinanceOfficer")
            {
                allowedPermissions = permissions.Where(
                    x =>
                        x.Module == "Dashboard" ||
                        x.Module == "Finance");
            }
            else
            {
                allowedPermissions = permissions.Where(
                    x =>
                        x.Module == "Dashboard" ||
                        x.Module == "PurchaseRequest");
            }

            foreach (var permission in allowedPermissions)
            {
                var exists = existingMappings.Any(
                    x =>
                        x.RoleId == role.Id &&
                        x.PermissionId == permission.Id);

                if (exists)
                    continue;

                mappings.Add(
                    new RolePermission(
                        role.Id,
                        permission.Id));
            }
        }

        if (mappings.Count == 0)
            return;

        await context.RolePermissions.AddRangeAsync(
            mappings,
            cancellationToken);

        await context.SaveChangesAsync(
            cancellationToken);
    }

    private static string CreatePermissionName(
        Permission permission)
    {
        return permission.ToString();
    }

    private static string CreatePermissionModule(
        Permission permission)
    {
        var name = permission.ToString();

        if (name.StartsWith("Dashboard"))
            return "Dashboard";

        if (name.StartsWith("User"))
            return "User";

        if (name.StartsWith("Role"))
            return "Role";

        if (name.StartsWith("Permission"))
            return "Permission";

        if (name.StartsWith("Organization"))
            return "Organization";

        if (name.StartsWith("Store"))
            return "Store";

        if (name.StartsWith("Item"))
            return "Item";

        if (name.StartsWith("Vendor"))
            return "Vendor";

        if (name.StartsWith("PurchaseRequest"))
            return "PurchaseRequest";

        if (name.StartsWith("Approval"))
            return "Approval";

        if (name.StartsWith("QuotationComparison"))
            return "QuotationComparison";

        if (name.StartsWith("Quotation"))
            return "Quotation";

        if (name.StartsWith("PurchaseOrder"))
            return "PurchaseOrder";

        if (name.StartsWith("Receiving"))
            return "Receiving";

        if (name.StartsWith("Inventory"))
            return "Inventory";

        if (name.StartsWith("Finance") ||
            name.StartsWith("Invoice") ||
            name.StartsWith("Payment"))
            return "Finance";

        if (name.StartsWith("Reports"))
            return "Reports";

        if (name.StartsWith("AuditLog"))
            return "AuditLog";

        if (name.StartsWith("SystemConfiguration"))
            return "SystemConfiguration";

        return "Other";
    }
}