namespace PIMS.Application.DTOs.Vendors;

public class VendorContactDto
{
    public int Id { get; set; }

    public int VendorId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Designation { get; set; }

    public string? Email { get; set; }

    public string? Phone { get; set; }

    public bool IsPrimary { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}