namespace PIMS.Application.DTOs.UsersAccess;

public record CreateUserRequest(
    string FullName,
    string Username,
    string Email,
    string Password,
    int? BranchId,
    int? DepartmentId,
    int? StoreId);

public record UpdateUserRequest(
    string FullName,
    string Email,
    int? BranchId,
    int? DepartmentId,
    int? StoreId);

public record AssignUserRoleRequest(
    int RoleId);

public record UserResponse(
    int Id,
    string FullName,
    string Username,
    string Email,
    bool IsActive,
    int? BranchId,
    int? DepartmentId,
    int? StoreId,
    List<int> RoleIds);