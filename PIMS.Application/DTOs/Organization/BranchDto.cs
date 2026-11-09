namespace PIMS.Application.DTOs.Organization;

public class BranchDto
{
    public int Id { get; set; }

    public int HeadOfficeId { get; set; }

    public string HeadOfficeName { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;

    public string? Address { get; set; }

    public string? Phone { get; set; }

    public string? Email { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }
}