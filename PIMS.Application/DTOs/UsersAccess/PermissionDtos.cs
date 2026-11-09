namespace PIMS.Application.DTOs.UsersAccess;

public record CreatePermissionRequest(
    string Code,
    string Name,
    string Module);

public record PermissionResponse(
    int Id,
    string Code,
    string Name,
    string Module,
    bool IsActive);