
using PIMS.Domain.Common;

namespace PIMS.Domain.Entities.Procurement;

public class GoodsReceiptItem : BaseEntity
{
    private GoodsReceiptItem()
    {
    }

    public GoodsReceiptItem(
        int purchaseOrderItemId,
        decimal receivedQuantity,
        decimal acceptedQuantity,
        decimal rejectedQuantity,
        string? rejectionReason = null,
        string? remarks = null)
    {
        if (purchaseOrderItemId <= 0)
            throw new ArgumentException("Purchase Order Item ID is invalid.");

        if (receivedQuantity <= 0)
            throw new ArgumentException("Received quantity must be greater than zero.");

        if (acceptedQuantity < 0 || rejectedQuantity < 0)
            throw new ArgumentException("Accepted and rejected quantities cannot be negative.");

        if (acceptedQuantity + rejectedQuantity > receivedQuantity)
            throw new ArgumentException("Accepted and rejected quantities cannot exceed received quantity.");

        if (rejectionReason?.Trim().Length > 500)
            throw new ArgumentException("Rejection reason cannot exceed 500 characters.");

        if (remarks?.Trim().Length > 500)
            throw new ArgumentException("Remarks cannot exceed 500 characters.");

        PurchaseOrderItemId = purchaseOrderItemId;
        ReceivedQuantity = receivedQuantity;
        AcceptedQuantity = acceptedQuantity;
        RejectedQuantity = rejectedQuantity;
        RejectionReason = string.IsNullOrWhiteSpace(rejectionReason)
            ? null
            : rejectionReason.Trim();
        Remarks = string.IsNullOrWhiteSpace(remarks) ? null : remarks.Trim();
    }

    public int GoodsReceiptId { get; private set; }

    public GoodsReceipt GoodsReceipt { get; private set; } = null!;

    public int PurchaseOrderItemId { get; private set; }

    public PurchaseOrderItem PurchaseOrderItem { get; private set; } = null!;

    public decimal ReceivedQuantity { get; private set; }

    public decimal AcceptedQuantity { get; private set; }

    public decimal RejectedQuantity { get; private set; }

    public string? RejectionReason { get; private set; }

    public string? Remarks { get; private set; }
}
