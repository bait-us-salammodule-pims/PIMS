namespace PIMS.Application.DTOs.Vendors;

public class VendorItemPriceDto
{
    public int Id { get; set; }

    public int VendorId { get; set; }

    public int ItemId { get; set; }

    public string ItemName { get; set; } = string.Empty;

    public string ItemCode { get; set; } = string.Empty;

    public decimal UnitPrice { get; set; }

    public string CurrencyCode { get; set; } = "PKR";

    public decimal MinimumOrderQuantity { get; set; }

    public DateTime EffectiveFrom { get; set; }

    public DateTime? EffectiveTo { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}