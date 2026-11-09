using PIMS.Domain.Entities.Auth;

namespace PIMS.Domain.Entities;

public class RoleTabAccess
{
    public int RoleId { get; set; }

    public int TabId { get; set; }

    public bool CanView { get; set; } = true;

    public Role Role { get; set; } = null!;

    public Tab Tab { get; set; } = null!;
}