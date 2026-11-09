namespace PIMS.Application.DTOs.UsersAccess;

public record TabDto(
    int Id,
    string Name,
    string Code,
    string? Route,
    string? Icon,
    int SortOrder,
    bool IsActive
);

public record CreateTabDto(
    string Name,
    string Code,
    string? Route,
    string? Icon,
    int SortOrder
);