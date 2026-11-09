using PIMS.Application.DTOs.Stores;

namespace PIMS.Application.Interfaces;

public interface IStoreService
{
    Task<IReadOnlyList<StoreResponse>> GetAllAsync(
        bool includeInactive = false,
        CancellationToken cancellationToken = default);

    Task<StoreResponse?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<StoreResponse> CreateAsync(
        CreateStoreRequest request,
        CancellationToken cancellationToken = default);

    Task<StoreResponse> UpdateAsync(
        int id,
        UpdateStoreRequest request,
        CancellationToken cancellationToken = default);

    Task DeactivateAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StoreLocationResponse>> GetLocationsAsync(
        int storeId,
        bool includeInactive = false,
        CancellationToken cancellationToken = default);

    Task<StoreLocationResponse> CreateLocationAsync(
        int storeId,
        CreateStoreLocationRequest request,
        CancellationToken cancellationToken = default);

    Task<StoreLocationResponse> UpdateLocationAsync(
        int storeId,
        int locationId,
        UpdateStoreLocationRequest request,
        CancellationToken cancellationToken = default);

    Task DeactivateLocationAsync(
        int storeId,
        int locationId,
        CancellationToken cancellationToken = default);
}