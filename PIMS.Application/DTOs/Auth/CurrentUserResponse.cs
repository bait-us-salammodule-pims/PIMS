namespace PIMS.Application.DTOs.Auth;

public class CurrentUserResponse
{
    public int UserId { get; set; }

    public string FullName { get; set; } = null!;

    public string Username { get; set; } = null!;

    public string Email { get; set; } = null!;

    public List<string> Roles { get; set; } = new();

    public List<string> Permissions { get; set; } = new();

    public int? BranchId { get; set; }

    public int? DepartmentId { get; set; }

    public int? StoreId { get; set; }
}