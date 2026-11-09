
using PIMS.Domain.Common;
using PIMS.Domain.Enums;

namespace PIMS.Domain.Entities.Procurement;

public class QuotationRequest : BaseEntity
{
    private QuotationRequest()
    {
    }

    public QuotationRequest(
        string quotationNumber,
        int purchaseRequestId,
        DateTime closingDate,
        string? notes = null)
    {
        SetQuotationNumber(quotationNumber);
        SetPurchaseRequestId(purchaseRequestId);
        SetClosingDate(closingDate);
        SetNotes(notes);

        Status = QuotationStatus.Draft;
        VendorQuotations = new List<VendorQuotation>();
    }

    public ICollection<VendorQuotation> VendorQuotations { get; private set; }
    = new List<VendorQuotation>();
    public string QuotationNumber { get; private set; } = string.Empty;

    public int PurchaseRequestId { get; private set; }

    public PurchaseRequest PurchaseRequest { get; private set; } = null!;

    public DateTime ClosingDate { get; private set; }

    public string? Notes { get; private set; }

    public QuotationStatus Status { get; private set; }

    public void UpdateDetails(
        DateTime closingDate,
        string? notes)
    {
        if (Status != QuotationStatus.Draft)
        {
            throw new InvalidOperationException(
                "Only draft quotation requests can be modified.");
        }

        SetClosingDate(closingDate);
        SetNotes(notes);
        MarkUpdated();
    }

    public void MarkSentToVendors()
    {
        if (Status != QuotationStatus.Draft)
        {
            throw new InvalidOperationException(
                "Only draft quotation requests can be sent to vendors.");
        }

        Status = QuotationStatus.SentToVendors;
        MarkUpdated();
    }

    public void MarkResponsesReceived()
    {
        if (Status != QuotationStatus.SentToVendors)
        {
            throw new InvalidOperationException(
                "Only quotation requests sent to vendors can receive responses.");
        }

        Status = QuotationStatus.ResponsesReceived;
        MarkUpdated();
    }

    public void StartComparison()
    {
        if (Status != QuotationStatus.ResponsesReceived)
        {
            throw new InvalidOperationException(
                "Responses must be received before comparison.");
        }

        Status = QuotationStatus.UnderComparison;
        MarkUpdated();
    }

    public void Award()
    {
        if (Status != QuotationStatus.UnderComparison)
        {
            throw new InvalidOperationException(
                "Only quotation requests under comparison can be awarded.");
        }

        Status = QuotationStatus.Awarded;
        MarkUpdated();
    }

    public void Cancel()
    {
        if (Status is QuotationStatus.Awarded or QuotationStatus.Cancelled)
        {
            throw new InvalidOperationException(
                "This quotation request cannot be cancelled.");
        }

        Status = QuotationStatus.Cancelled;
        MarkUpdated();
    }

    private void SetQuotationNumber(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException(
                "Quotation number is required.");
        }

        value = value.Trim().ToUpperInvariant();

        if (value.Length > 50)
        {
            throw new ArgumentException(
                "Quotation number cannot exceed 50 characters.");
        }

        QuotationNumber = value;
    }

    private void SetPurchaseRequestId(int value)
    {
        if (value <= 0)
        {
            throw new ArgumentException(
                "Purchase Request ID must be greater than zero.");
        }

        PurchaseRequestId = value;
    }

    private void SetClosingDate(DateTime value)
    {
        if (value == default)
        {
            throw new ArgumentException(
                "Quotation closing date is required.");
        }

        ClosingDate = value;
    }

    private void SetNotes(string? value)
    {
        value = string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();

        if (value?.Length > 2000)
        {
            throw new ArgumentException(
                "Notes cannot exceed 2000 characters.");
        }

        Notes = value;
    }
}
