using PIMS.Domain.Common;
using PIMS.Domain.Enums.Auth;

namespace PIMS.Domain.Entities.Auth;

public class User : BaseEntity, IAuditableEntity
{
    private User()
    {
    }

    public User(
        string fullName,
        string username,
        string email)
    {
        if (string.IsNullOrWhiteSpace(fullName))
            throw new ArgumentException("Full name is required.");

        if (string.IsNullOrWhiteSpace(username))
            throw new ArgumentException("Username is required.");

        if (string.IsNullOrWhiteSpace(email))
            throw new ArgumentException("Email is required.");

        FullName = fullName.Trim();
        Username = username.Trim();
        Email = email.Trim().ToLowerInvariant();
        IsActive = true;
    }

    public string FullName { get; private set; } = null!;

    public string Username { get; private set; } = null!;

    public string Email { get; private set; } = null!;

    public string PasswordHash { get; private set; } = null!;

    public bool IsActive { get; private set; }

    public int? BranchId { get; private set; }

    public int? DepartmentId { get; private set; }

    public int? StoreId { get; private set; }

    public int? CreatedBy { get; set; }

    public int? UpdatedBy { get; set; }

    public ICollection<UserRole> UserRoles { get; private set; }
        = new List<UserRole>();

    public ICollection<UserStoreAccess> StoreAccesses { get; private set; }
        = new List<UserStoreAccess>();

    public ICollection<UserStoreAssignment> StoreAssignments { get; set; }
    = new List<UserStoreAssignment>();

    public void SetPasswordHash(string passwordHash)
    {
        if (string.IsNullOrWhiteSpace(passwordHash))
            throw new ArgumentException("Password hash is required.");

        PasswordHash = passwordHash;
    }

    public void UpdateProfile(
        string fullName,
        string email)
    {
        if (string.IsNullOrWhiteSpace(fullName))
            throw new ArgumentException("Full name is required.");

        if (string.IsNullOrWhiteSpace(email))
            throw new ArgumentException("Email is required.");

        FullName = fullName.Trim();
        Email = email.Trim().ToLowerInvariant();

        MarkUpdated();
    }

    public void AssignScope(
        int? branchId,
        int? departmentId,
        int? storeId)
    {
        BranchId = branchId;
        DepartmentId = departmentId;
        StoreId = storeId;

        MarkUpdated();
    }

    public void Activate()
    {
        IsActive = true;
        MarkUpdated();
    }

    public void AssignRole(int roleId)
    {
        if (roleId <= 0)
            throw new ArgumentException("Role ID is required.");

        if (UserRoles.Any(x => x.RoleId == roleId))
            return;

        UserRoles.Add(
            new UserRole(
                Id,
                roleId));

        MarkUpdated();
    }
    public void Deactivate()
    {
        IsActive = false;
        MarkUpdated();
    }
}