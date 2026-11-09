using PIMS.Domain.Common;

namespace PIMS.Domain.Entities.Auth;

public class PermissionDefinition : BaseEntity
{
    private PermissionDefinition()
    {
    }

    public PermissionDefinition(
        string code,
        string name,
        string module)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new ArgumentException("Permission code is required.");

        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Permission name is required.");

        if (string.IsNullOrWhiteSpace(module))
            throw new ArgumentException("Permission module is required.");

        Code = code.Trim();
        Name = name.Trim();
        Module = module.Trim();
        IsActive = true;
    }

    public string Code { get; private set; } = null!;

    public string Name { get; private set; } = null!;

    public string Module { get; private set; } = null!;

    public bool IsActive { get; private set; }

    public ICollection<RolePermission> RolePermissions { get; private set; }
        = new List<RolePermission>();

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