namespace PIMS.Application.DTOs.UsersAccess;

public record AssignRoleDto(
    int UserId,
    int RoleId
);

public record AssignPermissionDto(
    int RoleId,
    int PermissionId
);

public record AssignTabDto(
    int RoleId,
    int TabId,
    bool CanView
);

public record AssignStoreDto(
    int UserId,
    int StoreId,
    bool IsDefault
);