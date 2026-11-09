using PIMS.Domain.Common;

namespace PIMS.Domain.Entities.Organization;

public class Department : BaseEntity
{
    public int BranchId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;

    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public Branch Branch { get; set; } = null!;

    public ICollection<SubDepartment> SubDepartments { get; set; } =
        new List<SubDepartment>();
}