
using PIMS.Application.DTOs.Inventory;

namespace PIMS.Application.Interfaces.Inventory;

public interface IStockTransferService
{
    Task<IReadOnlyList<StockTransferResponseDto>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<StockTransferResponseDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<StockTransferResponseDto> CreateAsync(
        CreateStockTransferDto request,
        CancellationToken cancellationToken = default);

    Task<StockTransferResponseDto> SubmitAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<StockTransferResponseDto> ApproveAsync(
        int id,
        string approvedBy,
        CancellationToken cancellationToken = default);

    Task<StockTransferResponseDto> RejectAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<StockTransferResponseDto> DispatchAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<StockTransferResponseDto> ReceiveAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<StockTransferResponseDto> CancelAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<StockTransferResponseDto> UpdateNotesAsync(
        int id,
        UpdateStockTransferNotesDto request,
        CancellationToken cancellationToken = default);
}
