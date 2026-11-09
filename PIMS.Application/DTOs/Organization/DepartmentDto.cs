namespace PIMS.Application.DTOs.Organization;

public class DepartmentDto
{
    public int Id { get; set; }

    public int BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;

    public string? Description { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }
}