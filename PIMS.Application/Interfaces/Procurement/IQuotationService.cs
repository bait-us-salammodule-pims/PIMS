
using PIMS.Application.DTOs.Procurement;

namespace PIMS.Application.Interfaces.Procurement;

public interface IQuotationService
{
    Task<QuotationRequestResponseDto> CreateAsync(
        CreateQuotationRequestDto request,
        CancellationToken cancellationToken = default);

    Task<List<QuotationRequestResponseDto>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<QuotationRequestResponseDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<QuotationRequestResponseDto> UpdateAsync(
        int id,
        UpdateQuotationRequestDto request,
        CancellationToken cancellationToken = default);

    Task<QuotationRequestResponseDto> SendToVendorsAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<VendorQuotationResponseDto> AddVendorQuotationAsync(
        int quotationRequestId,
        CreateVendorQuotationDto request,
        CancellationToken cancellationToken = default);

    Task<QuotationRequestResponseDto> MarkResponsesReceivedAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<QuotationRequestResponseDto> StartComparisonAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<List<QuotationComparisonItemDto>> CompareAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<QuotationRequestResponseDto> SelectVendorQuotationAsync(
        int id,
        int vendorQuotationId,
        CancellationToken cancellationToken = default);

    Task<QuotationRequestResponseDto> CancelAsync(
        int id,
        CancellationToken cancellationToken = default);
}
