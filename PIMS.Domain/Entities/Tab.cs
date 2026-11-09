namespace PIMS.Domain.Entities;

public class Tab
{
    public int Id { get; set; }

    public string Name { get; set; } = null!;

    public string Code { get; set; } = null!;

    public string? Route { get; set; }

    public string? Icon { get; set; }

    public int SortOrder { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<RoleTabAccess> RoleTabAccesses { get; set; }
        = new List<RoleTabAccess>();
}