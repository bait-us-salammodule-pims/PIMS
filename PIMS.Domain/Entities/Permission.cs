using PIMS.Domain.Entities.Auth;

namespace PIMS.Domain.Entities;

public class Permission
{
    public int Id { get; set; }

    public string Code { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<RolePermission> RolePermissions { get; set; }
        = new List<RolePermission>();
}