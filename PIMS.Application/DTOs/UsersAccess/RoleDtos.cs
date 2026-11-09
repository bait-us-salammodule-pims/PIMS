namespace PIMS.Application.DTOs.UsersAccess;

public record CreateRoleRequest(
    string Name,
    string? Description);

public record UpdateRoleRequest(
    string Name,
    string? Description);

public record RoleResponse(
    int Id,
    string Name,
    string? Description,
    bool IsActive,
    List<int> PermissionIds);