
namespace PIMS.Domain.Enums;

public enum PurchaseOrderStatus
{
    Draft = 0,
    PendingApproval = 1,
    Approved = 2,
    Issued = 3,
    PartiallyReceived = 4,
    FullyReceived = 5,
    Cancelled = 6
}
