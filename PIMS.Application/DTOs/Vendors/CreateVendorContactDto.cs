using System.ComponentModel.DataAnnotations;

namespace PIMS.Application.DTOs.Vendors;

public class CreateVendorContactDto
{
    [Required, StringLength(200, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [StringLength(100)]
    public string? Designation { get; set; }

    [EmailAddress, StringLength(254)]
    public string? Email { get; set; }

    [StringLength(30)]
    public string? Phone { get; set; }

    public bool IsPrimary { get; set; }
}