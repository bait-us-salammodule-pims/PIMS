using PIMS.Domain.Common;
using PIMS.Domain.Enums.Auth;

namespace PIMS.Domain.Entities.Auth;

public class Role : BaseEntity
{
    private Role()
    {
    }

    public Role(string name, string? description)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Role name is required.");

        Name = name.Trim();
        Description = description?.Trim();
        IsActive = true;
    }

    public string Name { get; private set; } = null!;

    public string? Description { get; private set; }

    public bool IsActive { get; private set; }

    public ICollection<UserRole> UserRoles { get; private set; }
        = new List<UserRole>();

    public ICollection<RolePermission> RolePermissions { get; private set; }
        = new List<RolePermission>();

    public ICollection<RoleTabAccess> RoleTabAccesses { get; set; }
    = new List<RoleTabAccess>();

    public void Update(
        string name,
        string? description)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Role name is required.");

        Name = name.Trim();
        Description = description?.Trim();

        MarkUpdated();
    }

    public void Activate()
    {
        IsActive = true;
        MarkUpdated();
    }

    public void Deactivate()
    {
        IsActive = false;
        MarkUpdated();
    }
}