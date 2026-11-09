using PIMS.Domain.Entities.Items;

namespace PIMS.Domain.Entities;

public class VendorItemPrice : Common.BaseEntity
{
    public int VendorId { get; private set; }
    public Vendor Vendor { get; private set; } = null!;

    public int ItemId { get; private set; }
    public Item Item { get; private set; } = null!;

    public decimal UnitPrice { get; private set; }

    public string CurrencyCode { get; private set; } = "PKR";

    public decimal MinimumOrderQuantity { get; private set; } = 1;

    public DateTime EffectiveFrom { get; private set; }

    public DateTime? EffectiveTo { get; private set; }

    public bool IsActive { get; private set; } = true;

    private VendorItemPrice()
    {
    }

    public VendorItemPrice(
        int vendorId,
        int itemId,
        decimal unitPrice,
        string currencyCode,
        decimal minimumOrderQuantity,
        DateTime effectiveFrom,
        DateTime? effectiveTo = null)
    {
        Validate(vendorId, itemId, unitPrice, currencyCode,
            minimumOrderQuantity, effectiveFrom, effectiveTo);

        VendorId = vendorId;
        ItemId = itemId;
        UnitPrice = unitPrice;
        CurrencyCode = NormalizeCurrency(currencyCode);
        MinimumOrderQuantity = minimumOrderQuantity;
        EffectiveFrom = effectiveFrom;
        EffectiveTo = effectiveTo;
        IsActive = true;
    }

    public void UpdateDetails(
        decimal unitPrice,
        string currencyCode,
        decimal minimumOrderQuantity,
        DateTime effectiveFrom,
        DateTime? effectiveTo)
    {
        Validate(VendorId, ItemId, unitPrice, currencyCode,
            minimumOrderQuantity, effectiveFrom, effectiveTo);

        UnitPrice = unitPrice;
        CurrencyCode = NormalizeCurrency(currencyCode);
        MinimumOrderQuantity = minimumOrderQuantity;
        EffectiveFrom = effectiveFrom;
        EffectiveTo = effectiveTo;

        MarkUpdated();
    }

    public void Activate()
    {
        if (IsActive)
            return;

        IsActive = true;
        MarkUpdated();
    }

    public void Deactivate()
    {
        if (!IsActive)
            return;

        IsActive = false;
        MarkUpdated();
    }

    private static void Validate(
        int vendorId,
        int itemId,
        decimal unitPrice,
        string currencyCode,
        decimal minimumOrderQuantity,
        DateTime effectiveFrom,
        DateTime? effectiveTo)
    {
        if (vendorId <= 0)
            throw new ArgumentException("A valid vendor ID is required.");

        if (itemId <= 0)
            throw new ArgumentException("A valid item ID is required.");

        if (unitPrice < 0)
            throw new ArgumentOutOfRangeException(
                nameof(unitPrice), "Unit price cannot be negative.");

        if (string.IsNullOrWhiteSpace(currencyCode) ||
            currencyCode.Trim().Length != 3)
        {
            throw new ArgumentException(
                "Currency code must contain exactly 3 characters.");
        }

        if (minimumOrderQuantity <= 0)
            throw new ArgumentOutOfRangeException(
                nameof(minimumOrderQuantity),
                "Minimum order quantity must be greater than zero.");

        if (effectiveTo.HasValue && effectiveTo.Value < effectiveFrom)
        {
            throw new ArgumentException(
                "Effective-to date cannot be earlier than effective-from date.");
        }
    }

    private static string NormalizeCurrency(string currencyCode)
    {
        return currencyCode.Trim().ToUpperInvariant();
    }
}