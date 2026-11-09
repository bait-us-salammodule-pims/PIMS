namespace PIMS.Domain.Entities.Auth;

public class UserStoreAccess
{
    private UserStoreAccess()
    {
    }

    public UserStoreAccess(
        int userId,
        int storeId)
    {
        UserId = userId;
        StoreId = storeId;
        IsActive = true;
    }

    public int UserId { get; private set; }

    public int StoreId { get; private set; }

    public bool IsActive { get; private set; }

    public User User { get; private set; } = null!;

    public void Activate()
    {
        IsActive = true;
    }

    public void Deactivate()
    {
        IsActive = false;
    }
}