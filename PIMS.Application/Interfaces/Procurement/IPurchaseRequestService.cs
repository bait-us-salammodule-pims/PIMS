
using PIMS.Application.DTOs.Procurement;
using PIMS.Application.Interfaces;

namespace PIMS.Application.Interfaces.Procurement;

public interface IPurchaseRequestService
{
    Task<PurchaseRequestResponseDto> CreateAsync(
        CreatePurchaseRequestDto request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PurchaseRequestResponseDto>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<PurchaseRequestResponseDto> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<PurchaseRequestResponseDto> UpdateAsync(
        int id,
        UpdatePurchaseRequestDto request,
        CancellationToken cancellationToken = default);

    Task<PurchaseRequestItemResponseDto> AddItemAsync(
        int requestId,
        CreatePurchaseRequestItemDto request,
        CancellationToken cancellationToken = default);

    Task<PurchaseRequestItemResponseDto> UpdateItemAsync(
        int requestId,
        int itemId,
        UpdatePurchaseRequestItemDto request,
        CancellationToken cancellationToken = default);

    Task RemoveItemAsync(
        int requestId,
        int itemId,
        CancellationToken cancellationToken = default);

    Task<PurchaseRequestResponseDto> SubmitAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<PurchaseRequestResponseDto> CancelAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<PurchaseRequestResponseDto> StartReviewAsync(
    int id,
    CancellationToken cancellationToken = default);

    Task<PurchaseRequestResponseDto> ApproveAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<PurchaseRequestResponseDto> RejectAsync(
        int id,
        CancellationToken cancellationToken = default);
}
