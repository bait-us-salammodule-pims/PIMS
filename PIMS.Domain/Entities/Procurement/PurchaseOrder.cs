
using PIMS.Domain.Common;
using PIMS.Domain.Enums;

namespace PIMS.Domain.Entities.Procurement;

public class PurchaseOrder : BaseEntity
{
    private PurchaseOrder()
    {
    }

    public PurchaseOrder(
        string orderNumber,
        int purchaseRequestId,
        int quotationRequestId,
        int vendorQuotationId,
        int vendorId,
        DateTime orderDate,
        DateTime expectedDeliveryDate,
        string? notes = null)
    {
        SetOrderNumber(orderNumber);
        SetPurchaseRequestId(purchaseRequestId);
        SetQuotationRequestId(quotationRequestId);
        SetVendorQuotationId(vendorQuotationId);
        SetVendorId(vendorId);
        SetOrderDate(orderDate);
        SetExpectedDeliveryDate(expectedDeliveryDate);
        SetNotes(notes);

        Status = PurchaseOrderStatus.Draft;
        Items = new List<PurchaseOrderItem>();
    }

    public string OrderNumber { get; private set; } = string.Empty;

    public int PurchaseRequestId { get; private set; }

    public PurchaseRequest PurchaseRequest { get; private set; } = null!;

    public int QuotationRequestId { get; private set; }

    public QuotationRequest QuotationRequest { get; private set; } = null!;

    public int VendorQuotationId { get; private set; }

    public VendorQuotation VendorQuotation { get; private set; } = null!;

    public int VendorId { get; private set; }

    public Vendor Vendor { get; private set; } = null!;

    public DateTime OrderDate { get; private set; }

    public DateTime ExpectedDeliveryDate { get; private set; }

    public string? Notes { get; private set; }

    public PurchaseOrderStatus Status { get; private set; }

    public ICollection<PurchaseOrderItem> Items { get; private set; }
        = new List<PurchaseOrderItem>();

    public decimal Subtotal => Items.Sum(x => x.Quantity * x.UnitPrice);

    public decimal TaxAmount => Items.Sum(
        x => Math.Round(
            x.Quantity * x.UnitPrice * x.TaxPercentage / 100m,
            2,
            MidpointRounding.AwayFromZero));

    public decimal TotalAmount => Subtotal + TaxAmount;


    public void UpdateDetails(DateTime expectedDeliveryDate, string? notes)
    {
        EnsureDraft();

        SetExpectedDeliveryDate(expectedDeliveryDate);
        SetNotes(notes);

        MarkUpdated();
    }

    public void AddItem(PurchaseOrderItem item)
    {
        if (Status != PurchaseOrderStatus.Draft)
            throw new InvalidOperationException(
                "Items can only be added to draft purchase orders.");

        ArgumentNullException.ThrowIfNull(item);

        if (Items.Any(x => x.PurchaseRequestItemId == item.PurchaseRequestItemId))
            throw new InvalidOperationException(
                "This purchase request item already exists in the order.");

        Items.Add(item);
        MarkUpdated();
    }

    public void SubmitForApproval()
    {
        EnsureDraft();

        if (Items.Count == 0)
            throw new InvalidOperationException(
                "At least one item is required.");

        Status = PurchaseOrderStatus.PendingApproval;
        MarkUpdated();
    }

    public void Approve()
    {
        if (Status != PurchaseOrderStatus.PendingApproval)
            throw new InvalidOperationException(
                "Only purchase orders pending approval can be approved.");

        Status = PurchaseOrderStatus.Approved;
        MarkUpdated();
    }

    public void Issue()
    {
        if (Status != PurchaseOrderStatus.Approved)
            throw new InvalidOperationException(
                "Only approved purchase orders can be issued.");

        Status = PurchaseOrderStatus.Issued;
        MarkUpdated();
    }

    public void MarkPartiallyReceived()
    {
        if (Status != PurchaseOrderStatus.Issued &&
            Status != PurchaseOrderStatus.PartiallyReceived)
            throw new InvalidOperationException(
                "Only issued orders can be marked partially received.");

        Status = PurchaseOrderStatus.PartiallyReceived;
        MarkUpdated();
    }

    public void MarkFullyReceived()
    {
        if (Status != PurchaseOrderStatus.Issued &&
            Status != PurchaseOrderStatus.PartiallyReceived)
            throw new InvalidOperationException(
                "Only issued orders can be marked fully received.");

        Status = PurchaseOrderStatus.FullyReceived;
        MarkUpdated();
    }

    public void Cancel()
    {
        if (Status is PurchaseOrderStatus.Issued
            or PurchaseOrderStatus.PartiallyReceived
            or PurchaseOrderStatus.FullyReceived
            or PurchaseOrderStatus.Cancelled)
            throw new InvalidOperationException(
                "This purchase order cannot be cancelled.");

        Status = PurchaseOrderStatus.Cancelled;
        MarkUpdated();
    }

    private void EnsureDraft()
    {
        if (Status != PurchaseOrderStatus.Draft)
            throw new InvalidOperationException(
                "Only draft purchase orders can be submitted.");
    }

    private void SetOrderNumber(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("Order number is required.");

        value = value.Trim().ToUpperInvariant();

        if (value.Length > 50)
            throw new ArgumentException(
                "Order number cannot exceed 50 characters.");

        OrderNumber = value;
    }

    private void SetPurchaseRequestId(int value)
    {
        if (value <= 0)
            throw new ArgumentException("Purchase Request ID is invalid.");

        PurchaseRequestId = value;
    }

    private void SetQuotationRequestId(int value)
    {
        if (value <= 0)
            throw new ArgumentException("Quotation Request ID is invalid.");

        QuotationRequestId = value;
    }

    private void SetVendorQuotationId(int value)
    {
        if (value <= 0)
            throw new ArgumentException("Vendor Quotation ID is invalid.");

        VendorQuotationId = value;
    }

    private void SetVendorId(int value)
    {
        if (value <= 0)
            throw new ArgumentException("Vendor ID is invalid.");

        VendorId = value;
    }

    private void SetOrderDate(DateTime value)
    {
        if (value == default)
            throw new ArgumentException("Order date is required.");

        OrderDate = value;
    }

    private void SetExpectedDeliveryDate(DateTime value)
    {
        if (value == default)
            throw new ArgumentException(
                "Expected delivery date is required.");

        if (value.Date < OrderDate.Date)
            throw new ArgumentException(
                "Expected delivery date cannot be before order date.");

        ExpectedDeliveryDate = value;
    }

    private void SetNotes(string? value)
    {
        value = string.IsNullOrWhiteSpace(value) ? null : value.Trim();

        if (value?.Length > 2000)
            throw new ArgumentException(
                "Notes cannot exceed 2000 characters.");

        Notes = value;
    }
}
