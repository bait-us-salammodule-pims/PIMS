
using PIMS.Application.DTOs.Procurement;

namespace PIMS.Application.Interfaces.Procurement;

public interface IGoodsReceiptService
{
    Task<IReadOnlyList<GoodsReceiptResponseDto>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<GoodsReceiptResponseDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<GoodsReceiptResponseDto> CreateAsync(
        CreateGoodsReceiptDto request,
        CancellationToken cancellationToken = default);

    Task<GoodsReceiptResponseDto> SubmitAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<GoodsReceiptResponseDto> InspectAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<GoodsReceiptResponseDto> RecordInspectionResultAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<GoodsReceiptResponseDto> CancelAsync(
    int id,
    CancellationToken cancellationToken = default);

    Task<GoodsReceiptResponseDto> PostToInventoryAsync(
        int id,
        CancellationToken cancellationToken = default);

}
