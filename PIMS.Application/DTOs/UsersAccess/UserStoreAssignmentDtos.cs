namespace PIMS.Application.DTOs.UsersAccess;

public record AssignUserStoreRequest(
    int StoreId,
    bool IsDefault = false);

public record UserStoreAssignmentResponse(
    int UserId,
    int StoreId,
    string StoreName,
    string StoreCode,
    bool IsDefault);