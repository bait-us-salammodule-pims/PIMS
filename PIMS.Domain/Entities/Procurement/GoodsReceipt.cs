
using PIMS.Domain.Common;
using PIMS.Domain.Enums;

namespace PIMS.Domain.Entities.Procurement;

public class GoodsReceipt : BaseEntity
{
    private GoodsReceipt()
    {
    }

    public GoodsReceipt(
        string receiptNumber,
        int purchaseOrderId,
        int storeId,
        DateTime receiptDate,
        string? deliveryChallanNumber = null,
        string? notes = null)
    {
        if (string.IsNullOrWhiteSpace(receiptNumber))
            throw new ArgumentException("Receipt number is required.");

        if (receiptNumber.Trim().Length > 50)
            throw new ArgumentException("Receipt number cannot exceed 50 characters.");

        if (purchaseOrderId <= 0)
            throw new ArgumentException("Purchase Order ID is invalid.");

        if (storeId <= 0)
            throw new ArgumentException("Store ID is invalid.");

        if (receiptDate == default)
            throw new ArgumentException("Receipt date is required.");

        if (deliveryChallanNumber?.Trim().Length > 100)
            throw new ArgumentException("Delivery challan number cannot exceed 100 characters.");

        if (notes?.Trim().Length > 2000)
            throw new ArgumentException("Notes cannot exceed 2000 characters.");

        ReceiptNumber = receiptNumber.Trim().ToUpperInvariant();
        PurchaseOrderId = purchaseOrderId;
        StoreId = storeId;
        ReceiptDate = receiptDate;
        DeliveryChallanNumber = string.IsNullOrWhiteSpace(deliveryChallanNumber)
            ? null
            : deliveryChallanNumber.Trim();
        Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();

        Status = GoodsReceiptStatus.Draft;
        Items = new List<GoodsReceiptItem>();
    }

    public string ReceiptNumber { get; private set; } = string.Empty;

    public int PurchaseOrderId { get; private set; }

    public PurchaseOrder PurchaseOrder { get; private set; } = null!;

    public int StoreId { get; private set; }

    public DateTime ReceiptDate { get; private set; }

    public string? DeliveryChallanNumber { get; private set; }

    public string? Notes { get; private set; }

    public GoodsReceiptStatus Status { get; private set; }

    public ICollection<GoodsReceiptItem> Items { get; private set; }
        = new List<GoodsReceiptItem>();

    public void AddItem(GoodsReceiptItem item)
    {
        if (Status != GoodsReceiptStatus.Draft)
            throw new InvalidOperationException("Items can only be added to draft receipts.");

        ArgumentNullException.ThrowIfNull(item);

        if (Items.Any(x => x.PurchaseOrderItemId == item.PurchaseOrderItemId))
            throw new InvalidOperationException("This Purchase Order item already exists in the receipt.");

        Items.Add(item);
        MarkUpdated();
    }

    public void Submit()
    {
        if (Status != GoodsReceiptStatus.Draft)
            throw new InvalidOperationException("Only draft receipts can be submitted.");

        if (Items.Count == 0)
            throw new InvalidOperationException("At least one receipt item is required.");

        Status = GoodsReceiptStatus.Submitted;
        MarkUpdated();
    }

    public void Inspect(bool acceptAll)
    {
        if (Status != GoodsReceiptStatus.Submitted)
            throw new InvalidOperationException("Only submitted receipts can be inspected.");

        Status = acceptAll
            ? GoodsReceiptStatus.Accepted
            : GoodsReceiptStatus.Inspected;

        MarkUpdated();
    }

    public void RecordInspectionResult(bool hasAccepted, bool hasRejected)
    {
        if (Status != GoodsReceiptStatus.Submitted &&
            Status != GoodsReceiptStatus.Inspected)
            throw new InvalidOperationException("This receipt cannot be inspected in its current status.");

        if (!hasAccepted && !hasRejected)
            throw new InvalidOperationException("Inspection must record accepted or rejected quantities.");

        Status = hasAccepted && hasRejected
            ? GoodsReceiptStatus.PartiallyAccepted
            : hasAccepted
                ? GoodsReceiptStatus.Accepted
                : GoodsReceiptStatus.Rejected;

        MarkUpdated();
    }

    public void Cancel()
    {
        if (Status is GoodsReceiptStatus.Accepted
            or GoodsReceiptStatus.PartiallyAccepted
            or GoodsReceiptStatus.Rejected
            or GoodsReceiptStatus.Cancelled)
            throw new InvalidOperationException("This receipt cannot be cancelled.");

        Status = GoodsReceiptStatus.Cancelled;
        MarkUpdated();
    }
}
