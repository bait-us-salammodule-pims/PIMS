
using PIMS.Domain.Common;

namespace PIMS.Domain.Entities.Procurement;

public class VendorQuotation : BaseEntity
{
    private VendorQuotation()
    {
    }

    public VendorQuotation(
        int quotationRequestId,
        int vendorId,
        string vendorQuotationNumber,
        DateTime submittedAt,
        DateTime validUntil,
        string? notes = null)
    {
        SetQuotationRequestId(quotationRequestId);
        SetVendorId(vendorId);
        SetVendorQuotationNumber(vendorQuotationNumber);
        SetSubmittedAt(submittedAt);
        SetValidUntil(validUntil);
        SetNotes(notes);

        Items = new List<VendorQuotationItem>();
    }

    public int QuotationRequestId { get; private set; }

    public QuotationRequest QuotationRequest { get; private set; } = null!;

    public int VendorId { get; private set; }

    public Vendor Vendor { get; private set; } = null!;

    public string VendorQuotationNumber { get; private set; } = string.Empty;

    public DateTime SubmittedAt { get; private set; }

    public DateTime ValidUntil { get; private set; }

    public string? Notes { get; private set; }

    public bool IsSelected { get; private set; }

    public ICollection<VendorQuotationItem> Items { get; private set; }
        = new List<VendorQuotationItem>();

    public void UpdateDetails(
        DateTime validUntil,
        string? notes)
    {
        if (IsSelected)
        {
            throw new InvalidOperationException(
                "A selected vendor quotation cannot be modified.");
        }

        SetValidUntil(validUntil);
        SetNotes(notes);
        MarkUpdated();
    }

    public void Select()
    {
        if (IsSelected)
        {
            throw new InvalidOperationException(
                "This vendor quotation is already selected.");
        }

        IsSelected = true;
        MarkUpdated();
    }

    private void SetQuotationRequestId(int value)
    {
        if (value <= 0)
        {
            throw new ArgumentException(
                "Quotation Request ID must be greater than zero.");
        }

        QuotationRequestId = value;
    }

    private void SetVendorId(int value)
    {
        if (value <= 0)
        {
            throw new ArgumentException(
                "Vendor ID must be greater than zero.");
        }

        VendorId = value;
    }

    private void SetVendorQuotationNumber(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException(
                "Vendor quotation number is required.");
        }

        value = value.Trim();

        if (value.Length > 100)
        {
            throw new ArgumentException(
                "Vendor quotation number cannot exceed 100 characters.");
        }

        VendorQuotationNumber = value;
    }

    private void SetSubmittedAt(DateTime value)
    {
        if (value == default)
        {
            throw new ArgumentException(
                "Submission date is required.");
        }

        SubmittedAt = value;
    }

    private void SetValidUntil(DateTime value)
    {
        if (value == default)
        {
            throw new ArgumentException(
                "Quotation validity date is required.");
        }

        if (value < SubmittedAt)
        {
            throw new ArgumentException(
                "Quotation validity cannot be earlier than submission.");
        }

        ValidUntil = value;
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
