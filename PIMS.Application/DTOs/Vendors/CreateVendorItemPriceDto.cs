
using System.ComponentModel.DataAnnotations;

namespace PIMS.Application.DTOs.Vendors;

public class CreateVendorItemPriceDto
{
    [Range(1, int.MaxValue)]
    public int ItemId { get; set; }

    [Range(typeof(decimal), "0.0001", "99999999999999")]
    public decimal UnitPrice { get; set; }

    [Required]
    [RegularExpression(
        "^[A-Za-z]{3}$",
        ErrorMessage = "Currency code must be a 3-letter code, e.g. PKR.")]
    public string CurrencyCode { get; set; } = "PKR";

    [Range(typeof(decimal), "0.0001", "99999999999999")]
    public decimal MinimumOrderQuantity { get; set; } = 1;

    public DateTime EffectiveFrom { get; set; } = DateTime.UtcNow;

    public DateTime? EffectiveTo { get; set; }
}
