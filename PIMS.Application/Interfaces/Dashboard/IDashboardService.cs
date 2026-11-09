
using PIMS.Application.DTOs.Dashboard;

namespace PIMS.Application.Interfaces.Dashboard;

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync(
        CancellationToken cancellationToken = default);
}
