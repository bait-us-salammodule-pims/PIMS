namespace PIMS.Domain.Enums.Auth;

public enum Permission
{
    DashboardView = 1,

    UserView = 10,
    UserCreate = 11,
    UserUpdate = 12,
    UserDeactivate = 13,

    RoleView = 20,
    RoleCreate = 21,
    RoleUpdate = 22,

    PermissionView = 30,
    PermissionManage = 31,

    OrganizationView = 40,
    OrganizationManage = 41,

    StoreView = 50,
    StoreManage = 51,

    ItemView = 60,
    ItemCreate = 61,
    ItemUpdate = 62,
    ItemDeactivate = 63,

    VendorView = 70,
    VendorCreate = 71,
    VendorUpdate = 72,
    VendorDeactivate = 73,

    PurchaseRequestView = 80,
    PurchaseRequestCreate = 81,
    PurchaseRequestUpdate = 82,
    PurchaseRequestSubmit = 83,

    ApprovalView = 90,
    ApprovalApprove = 91,
    ApprovalReject = 92,
    ApprovalReturn = 93,

    QuotationView = 100,
    QuotationCreate = 101,
    QuotationUpdate = 102,

    QuotationComparisonView = 110,
    QuotationComparisonCreate = 111,
    QuotationComparisonApprove = 112,

    PurchaseOrderView = 120,
    PurchaseOrderCreate = 121,
    PurchaseOrderApprove = 122,

    ReceivingView = 130,
    ReceivingCreate = 131,
    ReceivingUpdate = 132,

    InventoryView = 140,
    InventoryIssue = 141,
    InventoryTransfer = 142,
    InventoryReturn = 143,
    InventoryAdjustment = 144,

    FinanceView = 150,
    InvoiceView = 151,
    PaymentRecommendation = 152,

    ReportsView = 160,

    AuditLogView = 170,

    SystemConfigurationView = 180,
    SystemConfigurationManage = 181
} 