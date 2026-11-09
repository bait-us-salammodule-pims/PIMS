
using PIMS.Domain.Common;

namespace PIMS.Domain.Entities.Procurement;

public class PurchaseOrderItem : BaseEntity
{
    private PurchaseOrderItem()
    {
    }

    public PurchaseOrderItem(
        int purchaseRequestItemId,
        int itemId,
        decimal quantity,
        decimal unitPrice,
        decimal taxPercentage = 0,
        string? remarks = null)
    {
        if (purchaseRequestItemId <= 0)
            throw new ArgumentException(
                "Purchase Request Item ID is invalid.");

        if (itemId <= 0)
            throw new ArgumentException("Item ID is invalid.");

        if (quantity <= 0)
            throw new ArgumentException(
                "Quantity must be greater than zero.");

        if (unitPrice < 0)
            throw new ArgumentException(
                "Unit price cannot be negative.");

        if (taxPercentage < 0 || taxPercentage > 100)
            throw new ArgumentException(
                "Tax percentage must be between 0 and 100.");

        if (remarks?.Length > 500)
            throw new ArgumentException(
                "Remarks cannot exceed 500 characters.");

        PurchaseRequestItemId = purchaseRequestItemId;
        ItemId = itemId;
        Quantity = quantity;
        UnitPrice = unitPrice;
        TaxPercentage = taxPercentage;
        Remarks = string.IsNullOrWhiteSpace(remarks)
            ? null
            : remarks.Trim();
    }

    public int PurchaseOrderId { get; private set; }

    public PurchaseOrder PurchaseOrder { get; private set; } = null!;

    public int PurchaseRequestItemId { get; private set; }

    public PurchaseRequestItem PurchaseRequestItem { get; private set; } = null!;

    public int ItemId { get; private set; }

    public decimal Quantity { get; private set; }

    public decimal UnitPrice { get; private set; }

    public decimal TaxPercentage { get; private set; }

    public string? Remarks { get; private set; }

    public decimal LineSubtotal => Math.Round(
        Quantity * UnitPrice, 2, MidpointRounding.AwayFromZero);

    public decimal LineTax => Math.Round(
        LineSubtotal * TaxPercentage / 100m,
        2,
        MidpointRounding.AwayFromZero);

    public decimal LineTotal => LineSubtotal + LineTax;
}
