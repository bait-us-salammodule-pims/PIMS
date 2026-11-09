using PIMS.Domain.Common;

namespace PIMS.Domain.Entities.Organization;

public class Branch : BaseEntity
{
    public int HeadOfficeId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;

    public string? Address { get; set; }

    public string? Phone { get; set; }

    public string? Email { get; set; }

    public bool IsActive { get; set; } = true;

    public HeadOffice HeadOffice { get; set; } = null!;

    public ICollection<Department> Departments { get; set; } = new List<Department>();
}