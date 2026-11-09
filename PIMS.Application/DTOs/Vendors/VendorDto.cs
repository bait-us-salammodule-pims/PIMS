
using PIMS.Domain.Enums;

namespace PIMS.Application.DTOs.Vendors;

public class VendorDto
{
    public int Id { get; set; }

    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? LegalName { get; set; }

    public string? TaxRegistrationNumber { get; set; }
    public string? RegistrationNumber { get; set; }

    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Website { get; set; }

    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? City { get; set; }
    public string? Province { get; set; }
    public string? Country { get; set; }
    public string? PostalCode { get; set; }

    public int PaymentTermsDays { get; set; }
    public string? Notes { get; set; }

    public VendorApprovalStatus ApprovalStatus { get; set; }
    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
