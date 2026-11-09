namespace PIMS.Application.DTOs.UsersAccess;

public record RoleTabAccessDto(
    int RoleId,
    int TabId,
    string TabName,
    string TabCode,
    bool CanView
);

public record AssignRoleTabAccessDto(
    int TabId,
    bool CanView
);