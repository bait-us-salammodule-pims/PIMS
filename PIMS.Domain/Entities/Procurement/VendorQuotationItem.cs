
using PIMS.Domain.Common;

namespace PIMS.Domain.Entities.Procurement;

public class VendorQuotationItem : BaseEntity
{
    private VendorQuotationItem()
    {
    }

    public VendorQuotationItem(
        int purchaseRequestItemId,
        decimal quantity,
        decimal unitPrice,
        decimal taxPercentage = 0,
        string? remarks = null)
    {
        SetPurchaseRequestItemId(purchaseRequestItemId);
        SetQuantity(quantity);
        SetUnitPrice(unitPrice);
        SetTaxPercentage(taxPercentage);
        SetRemarks(remarks);
    }

    public int VendorQuotationId { get; private set; }

    public VendorQuotation VendorQuotation { get; private set; } = null!;

    public int PurchaseRequestItemId { get; private set; }

    public PurchaseRequestItem PurchaseRequestItem { get; private set; } = null!;

    public decimal Quantity { get; private set; }

    public decimal UnitPrice { get; private set; }

    public decimal TaxPercentage { get; private set; }

    public decimal LineTotal =>
        decimal.Round(
            Quantity * UnitPrice * (1 + TaxPercentage / 100m),
            2,
            MidpointRounding.AwayFromZero);

    public string? Remarks { get; private set; }

    public void Update(
        decimal quantity,
        decimal unitPrice,
        decimal taxPercentage,
        string? remarks)
    {
        SetQuantity(quantity);
        SetUnitPrice(unitPrice);
        SetTaxPercentage(taxPercentage);
        SetRemarks(remarks);
        MarkUpdated();
    }

    private void SetPurchaseRequestItemId(int value)
    {
        if (value <= 0)
        {
            throw new ArgumentException(
                "Purchase Request Item ID must be greater than zero.");
        }

        PurchaseRequestItemId = value;
    }

    private void SetQuantity(decimal value)
    {
        if (value <= 0 || value > 999999999999.999999m)
        {
            throw new ArgumentException(
                "Quantity must be greater than zero and within the allowed limit.");
        }

        Quantity = value;
    }

    private void SetUnitPrice(decimal value)
    {
        if (value < 0 || value > 999999999999.99m)
        {
            throw new ArgumentException(
                "Unit price must be non-negative and within the allowed limit.");
        }

        UnitPrice = value;
    }

    private void SetTaxPercentage(decimal value)
    {
        if (value < 0 || value > 100)
        {
            throw new ArgumentException(
                "Tax percentage must be between 0 and 100.");
        }

        TaxPercentage = value;
    }

    private void SetRemarks(string? value)
    {
        value = string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();

        if (value?.Length > 500)
        {
            throw new ArgumentException(
                "Remarks cannot exceed 500 characters.");
        }

        Remarks = value;
    }
}
