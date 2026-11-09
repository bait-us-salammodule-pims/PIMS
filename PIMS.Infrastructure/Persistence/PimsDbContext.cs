using Microsoft.EntityFrameworkCore;
using PIMS.Application.Interfaces;
using PIMS.Domain.Entities;
using PIMS.Domain.Entities.Auth;
using PIMS.Domain.Entities.Organization;
using PIMS.Domain.Entities.Items;
using PIMS.Domain.Entities.Procurement;
using PIMS.Domain.Entities.Inventory;

namespace PIMS.Infrastructure.Persistence;

public class PimsDbContext : DbContext, IUnitOfWork
{
    public PimsDbContext(
        DbContextOptions<PimsDbContext> options)
        : base(options)
    {
    }

    // =========================================================
    // AUTH
    // =========================================================

    public DbSet<User> Users => Set<User>();

    public DbSet<Role> Roles => Set<Role>();

    public DbSet<PermissionDefinition> PermissionDefinitions
        => Set<PermissionDefinition>();

    public DbSet<UserRole> UserRoles => Set<UserRole>();

    public DbSet<RolePermission> RolePermissions
        => Set<RolePermission>();

    public DbSet<UserStoreAccess> UserStoreAccess
        => Set<UserStoreAccess>();

    public DbSet<Permission> Permissions => Set<Permission>();

    public DbSet<Tab> Tabs => Set<Tab>();

    public DbSet<RoleTabAccess> RoleTabAccesses => Set<RoleTabAccess>();

    public DbSet<UserStoreAssignment> UserStoreAssignments
        => Set<UserStoreAssignment>();

    // =========================================================
    // ORGANIZATION
    // =========================================================

    public DbSet<HeadOffice> HeadOffices => Set<HeadOffice>();

    public DbSet<Branch> Branches => Set<Branch>();

    public DbSet<Department> Departments => Set<Department>();

    public DbSet<SubDepartment> SubDepartments
        => Set<SubDepartment>();

    // =========================================================
    // STORE MANAGEMENT
    // =========================================================

    public DbSet<PIMS.Domain.Entities.Store> Stores
    => Set<PIMS.Domain.Entities.Store>();

    public DbSet<PIMS.Domain.Entities.StoreLocation> StoreLocations
        => Set<PIMS.Domain.Entities.StoreLocation>();


    // =========================================================
    // VENDOR MANAGEMENT
    // =========================================================

    public DbSet<Vendor> Vendors => Set<Vendor>();

    public DbSet<VendorContact> VendorContacts
        => Set<VendorContact>();


    // ITEMS MANAGEMENT
    public DbSet<ItemCategory> ItemCategories => Set<ItemCategory>();

    public DbSet<Item> Items => Set<Item>();

    public DbSet<UnitOfMeasure> UnitsOfMeasure => Set<UnitOfMeasure>();

    public DbSet<PackageType> PackageTypes => Set<PackageType>();

    public DbSet<VendorItemPrice> VendorItemPrices
    => Set<VendorItemPrice>();

    public DbSet<PurchaseRequest> PurchaseRequests =>
    Set<PurchaseRequest>();

    public DbSet<PurchaseRequestItem> PurchaseRequestItems =>
        Set<PurchaseRequestItem>();

    public DbSet<QuotationRequest> QuotationRequests =>
    Set<QuotationRequest>();

    public DbSet<VendorQuotation> VendorQuotations =>
        Set<VendorQuotation>();

    public DbSet<VendorQuotationItem> VendorQuotationItems =>
        Set<VendorQuotationItem>();

    public DbSet<PurchaseOrder> PurchaseOrders =>
    Set<PurchaseOrder>();

    public DbSet<PurchaseOrderItem> PurchaseOrderItems =>
        Set<PurchaseOrderItem>();

    public DbSet<ItemPricing> ItemPricings => Set<ItemPricing>();

    public DbSet<GoodsReceipt> GoodsReceipts =>
    Set<GoodsReceipt>();

    public DbSet<GoodsReceiptItem> GoodsReceiptItems =>
        Set<GoodsReceiptItem>();

    public DbSet<InventoryBalance> InventoryBalances =>
    Set<InventoryBalance>();

    public DbSet<StockMovement> StockMovements =>
        Set<StockMovement>();

    public DbSet<StockTransfer> StockTransfers => Set<StockTransfer>();

    public DbSet<StockTransferItem> StockTransferItems => Set<StockTransferItem>();
    protected override void OnModelCreating(
        ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(
            typeof(PimsDbContext).Assembly);
    }
}