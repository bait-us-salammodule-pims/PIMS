using PIMS.Domain.Entities.Items;

namespace PIMS.Tests.Items;

public class ItemPricingTests
{
    private static readonly DateTime ValidEffectiveFrom =
        new(2026, 10, 12, 0, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Constructor_WithValidValues_ShouldCreatePricing()
    {
        var pricing = new ItemPricing(
            1,
            125.50m,
            "PKR",
            ValidEffectiveFrom);

        Assert.Equal(1, pricing.ItemId);
        Assert.Equal(125.50m, pricing.UnitPrice);
        Assert.Equal("PKR", pricing.CurrencyCode);
        Assert.Equal(ValidEffectiveFrom, pricing.EffectiveFrom);
        Assert.Null(pricing.EffectiveTo);
        Assert.True(pricing.IsActive);
    }

    [Fact]
    public void Constructor_WithCurrencyInLowercase_ShouldNormalizeCurrency()
    {
        var pricing = new ItemPricing(
            1,
            100m,
            " pkr ",
            ValidEffectiveFrom);

        Assert.Equal("PKR", pricing.CurrencyCode);
    }

    [Fact]
    public void Constructor_WithZeroPrice_ShouldSucceed()
    {
        var pricing = new ItemPricing(
            1,
            0m,
            "PKR",
            ValidEffectiveFrom);

        Assert.Equal(0m, pricing.UnitPrice);
    }

    [Fact]
    public void Constructor_WithNegativeItemId_ShouldThrowArgumentException()
    {
        Assert.Throws<ArgumentException>(() =>
            new ItemPricing(
                0,
                100m,
                "PKR",
                ValidEffectiveFrom));
    }

    [Fact]
    public void Constructor_WithNegativePrice_ShouldThrowArgumentException()
    {
        Assert.Throws<ArgumentException>(() =>
            new ItemPricing(
                1,
                -1m,
                "PKR",
                ValidEffectiveFrom));
    }

    [Fact]
    public void Constructor_WithInvalidCurrencyLength_ShouldThrowArgumentException()
    {
        Assert.Throws<ArgumentException>(() =>
            new ItemPricing(
                1,
                100m,
                "US",
                ValidEffectiveFrom));
    }

    [Fact]
    public void Constructor_WithMissingCurrency_ShouldThrowArgumentException()
    {
        Assert.Throws<ArgumentException>(() =>
            new ItemPricing(
                1,
                100m,
                " ",
                ValidEffectiveFrom));
    }

    [Fact]
    public void Constructor_WithDefaultEffectiveFrom_ShouldThrowArgumentException()
    {
        Assert.Throws<ArgumentException>(() =>
            new ItemPricing(
                1,
                100m,
                "PKR",
                default));
    }

    [Fact]
    public void Constructor_WithEndDateBeforeStartDate_ShouldThrowArgumentException()
    {
        var effectiveTo = ValidEffectiveFrom.AddDays(-1);

        Assert.Throws<ArgumentException>(() =>
            new ItemPricing(
                1,
                100m,
                "PKR",
                ValidEffectiveFrom,
                effectiveTo));
    }

    [Fact]
    public void Update_WithValidValues_ShouldUpdatePricing()
    {
        var pricing = new ItemPricing(
            1,
            100m,
            "PKR",
            ValidEffectiveFrom);

        var newEffectiveFrom = ValidEffectiveFrom.AddDays(1);

        pricing.Update(
            150.75m,
            "pkr",
            newEffectiveFrom,
            null,
            true);

        Assert.Equal(150.75m, pricing.UnitPrice);
        Assert.Equal("PKR", pricing.CurrencyCode);
        Assert.Equal(newEffectiveFrom, pricing.EffectiveFrom);
        Assert.Null(pricing.EffectiveTo);
        Assert.True(pricing.IsActive);
    }

    [Fact]
    public void Update_WithNegativePrice_ShouldThrowArgumentException()
    {
        var pricing = new ItemPricing(
            1,
            100m,
            "PKR",
            ValidEffectiveFrom);

        Assert.Throws<ArgumentException>(() =>
            pricing.Update(
                -10m,
                "PKR",
                ValidEffectiveFrom,
                null,
                true));
    }

    [Fact]
    public void Update_WithInactiveStatus_ShouldMarkPricingInactive()
    {
        var pricing = new ItemPricing(
            1,
            100m,
            "PKR",
            ValidEffectiveFrom);

        pricing.Update(
            100m,
            "PKR",
            ValidEffectiveFrom,
            null,
            false);

        Assert.False(pricing.IsActive);
    }
}