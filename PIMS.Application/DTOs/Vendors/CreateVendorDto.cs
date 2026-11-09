
using System.ComponentModel.DataAnnotations;

namespace PIMS.Application.DTOs.Vendors;

public class CreateVendorDto
{
    [Required, StringLength(50, MinimumLength = 2)]
    public string Code { get; set; } = string.Empty;

    [Required, StringLength(200, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [StringLength(200)]
    public string? LegalName { get; set; }

    [StringLength(100)]
    public string? TaxRegistrationNumber { get; set; }

    [StringLength(100)]
    public string? RegistrationNumber { get; set; }

    [EmailAddress, StringLength(254)]
    public string? Email { get; set; }

    [StringLength(30)]
    public string? Phone { get; set; }

    [StringLength(300), Url]
    public string? Website { get; set; }

    [StringLength(250)]
    public string? AddressLine1 { get; set; }

    [StringLength(250)]
    public string? AddressLine2 { get; set; }

    [StringLength(100)]
    public string? City { get; set; }

    [StringLength(100)]
    public string? Province { get; set; }

    [StringLength(100)]
    public string? Country { get; set; }

    [StringLength(20)]
    public string? PostalCode { get; set; }

    [Range(0, 365)]
    public int PaymentTermsDays { get; set; }

    [StringLength(2000)]
    public string? Notes { get; set; }
}
