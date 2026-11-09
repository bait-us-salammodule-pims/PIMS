using PIMS.Application.DTOs.UsersAccess;

namespace PIMS.Application.Interfaces.UsersAccess;

public interface ITabService
{
    Task<IReadOnlyList<TabDto>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<TabDto> CreateAsync(
        CreateTabDto request,
        CancellationToken cancellationToken = default);
}