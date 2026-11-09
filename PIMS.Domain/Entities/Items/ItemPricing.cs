
using PIMS.Domain.Common;

namespace PIMS.Domain.Entities.Items;

public class ItemPricing : BaseEntity
{
    public int ItemId { get; private set; }

    public Item? Item { get; private set; }

    public decimal UnitPrice { get; private set; }

    public string CurrencyCode { get; private set; } = "PKR";

    public DateTime EffectiveFrom { get; private set; }

    public DateTime? EffectiveTo { get; private set; }

    public bool IsActive { get; private set; } = true;

    private ItemPricing()
    {
    }

    public ItemPricing(
        int itemId,
        decimal unitPrice,
        string currencyCode,
        DateTime effectiveFrom,
        DateTime? effectiveTo = null)
    {
        SetItemId(itemId);
        SetUnitPrice(unitPrice);
        SetCurrencyCode(currencyCode);
        SetEffectiveDates(effectiveFrom, effectiveTo);
    }

    public void Update(
        decimal unitPrice,
        string currencyCode,
        DateTime effectiveFrom,
        DateTime? effectiveTo,
        bool isActive)
    {
        SetUnitPrice(unitPrice);
        SetCurrencyCode(currencyCode);
        SetEffectiveDates(effectiveFrom, effectiveTo);

        IsActive = isActive;

        MarkUpdated();
    }

    private void SetItemId(int itemId)
    {
        if (itemId <= 0)
        {
            throw new ArgumentException(
                "A valid item is required.");
        }

        ItemId = itemId;
    }

    private void SetUnitPrice(decimal unitPrice)
    {
        if (unitPrice < 0)
        {
            throw new ArgumentException(
                "Unit price cannot be negative.");
        }

        if (unitPrice > 999999999999.99m)
        {
            throw new ArgumentException(
                "Unit price exceeds the maximum allowed value.");
        }

        UnitPrice = unitPrice;
    }

    private void SetCurrencyCode(string currencyCode)
    {
        if (string.IsNullOrWhiteSpace(currencyCode))
        {
            throw new ArgumentException(
                "Currency code is required.");
        }

        currencyCode = currencyCode.Trim().ToUpperInvariant();

        if (currencyCode.Length != 3)
        {
            throw new ArgumentException(
                "Currency code must contain exactly 3 characters.");
        }

        CurrencyCode = currencyCode;
    }

    private void SetEffectiveDates(
        DateTime effectiveFrom,
        DateTime? effectiveTo)
    {
        if (effectiveFrom == default)
        {
            throw new ArgumentException(
                "Effective from date is required.");
        }

        if (effectiveTo.HasValue &&
            effectiveTo.Value < effectiveFrom)
        {
            throw new ArgumentException(
                "Effective to date cannot be earlier than effective from date.");
        }

        EffectiveFrom = effectiveFrom;
        EffectiveTo = effectiveTo;
    }
}
