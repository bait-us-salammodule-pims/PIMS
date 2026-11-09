
using PIMS.Application.DTOs.Procurement;

namespace PIMS.Application.Interfaces.Procurement;

public interface IPurchaseOrderService
{
    Task<IReadOnlyList<PurchaseOrderResponseDto>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<PurchaseOrderResponseDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<PurchaseOrderResponseDto> CreateAsync(
        CreatePurchaseOrderDto request,
        CancellationToken cancellationToken = default);

    Task<PurchaseOrderResponseDto> UpdateAsync(
        int id,
        UpdatePurchaseOrderDto request,
        CancellationToken cancellationToken = default);

    Task<PurchaseOrderResponseDto> SubmitForApprovalAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<PurchaseOrderResponseDto> ApproveAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<PurchaseOrderResponseDto> IssueAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<PurchaseOrderResponseDto> CancelAsync(
        int id,
        CancellationToken cancellationToken = default);
}
