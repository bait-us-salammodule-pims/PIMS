using PIMS.Domain.Entities.Auth;

namespace PIMS.Domain.Entities;

public class UserStoreAssignment
{
    public int UserId { get; set; }

    public int StoreId { get; set; }

    public bool IsDefault { get; set; }

    public User User { get; set; } = null!;

    public Store Store { get; set; } = null!;
}