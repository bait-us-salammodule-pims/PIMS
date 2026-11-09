namespace PIMS.Application.Interfaces;

public interface ICurrentUserService
{
    int? UserId { get; }

    string? Role { get; }

    int? BranchId { get; }

    int? DepartmentId { get; }

    int? StoreId { get; }
}