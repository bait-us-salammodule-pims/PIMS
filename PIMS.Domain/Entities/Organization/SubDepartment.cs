using PIMS.Domain.Common;

namespace PIMS.Domain.Entities.Organization;

public class SubDepartment : BaseEntity
{
    public int DepartmentId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;

    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public Department Department { get; set; } = null!;
}