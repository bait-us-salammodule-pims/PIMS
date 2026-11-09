namespace PIMS.Domain.Entities.Auth;

public class RolePermission
{
    private RolePermission()
    {
    }

    public RolePermission(
        int roleId,
        int permissionId)
    {
        RoleId = roleId;
        PermissionId = permissionId;
    }

    public int RoleId { get; private set; }

    public int PermissionId { get; private set; }

    public Role Role { get; private set; } = null!;

    public PermissionDefinition Permission { get; private set; } = null!;
}