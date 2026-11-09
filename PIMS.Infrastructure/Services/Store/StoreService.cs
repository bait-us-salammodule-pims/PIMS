using Microsoft.EntityFrameworkCore;
using PIMS.Application.DTOs.Stores;
using PIMS.Application.Interfaces;
using PIMS.Domain.Entities;
using PIMS.Domain.Enums;
using PIMS.Infrastructure.Persistence;

namespace PIMS.Infrastructure.Services.Store;

public class StoreService : IStoreService
{
    private readonly PimsDbContext _context;

    public StoreService(PimsDbContext context)
    {
        _context = context;
    }

    // =========================================================
    // STORE
    // =========================================================

    public async Task<IReadOnlyList<StoreResponse>> GetAllAsync(
        bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Stores
            .AsNoTracking()
            .AsQueryable();

        if (!includeInactive)
        {
            query = query.Where(x => x.IsActive);
        }

        return await query
            .OrderBy(x => x.Name)
            .Select(x => new StoreResponse
            {
                Id = x.Id,
                Name = x.Name,
                Code = x.Code,
                ImageUrl = x.ImageUrl,
                StoreType = x.StoreType,
                ReceiptFormat = x.ReceiptFormat,
                PosType = x.PosType,
                BuildingLocation = x.BuildingLocation,
                RoomLocation = x.RoomLocation,
                Email = x.Email,
                CellNo = x.CellNo,
                Description = x.Description,
                BranchId = x.BranchId,
                DepartmentId = x.DepartmentId,
                IsActive = x.IsActive,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<StoreResponse?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        return await _context.Stores
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new StoreResponse
            {
                Id = x.Id,
                Name = x.Name,
                Code = x.Code,
                ImageUrl = x.ImageUrl,
                StoreType = x.StoreType,
                ReceiptFormat = x.ReceiptFormat,
                PosType = x.PosType,
                BuildingLocation = x.BuildingLocation,
                RoomLocation = x.RoomLocation,
                Email = x.Email,
                CellNo = x.CellNo,
                Description = x.Description,
                BranchId = x.BranchId,
                DepartmentId = x.DepartmentId,
                IsActive = x.IsActive,
                CreatedAt = x.CreatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<StoreResponse> CreateAsync(
        CreateStoreRequest request,
        CancellationToken cancellationToken = default)
    {
        var name = request.Name.Trim();
        var code = request.Code.Trim();

        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException(
                "Store name is required.",
                nameof(request.Name));
        }

        if (string.IsNullOrWhiteSpace(code))
        {
            throw new ArgumentException(
                "Store code is required.",
                nameof(request.Code));
        }

        var codeExists = await _context.Stores
            .AnyAsync(
                x => x.Code == code,
                cancellationToken);

        if (codeExists)
        {
            throw new InvalidOperationException(
                $"A store with code '{code}' already exists.");
        }

        var store = new PIMS.Domain.Entities.Store
        {
            Name = name,
            Code = code,
            ImageUrl = request.ImageUrl,
            StoreType = request.StoreType,
            ReceiptFormat = request.ReceiptFormat,
            PosType = request.PosType,
            BuildingLocation = request.BuildingLocation,
            RoomLocation = request.RoomLocation,
            Email = request.Email,
            CellNo = request.CellNo,
            Description = request.Description,
            BranchId = request.BranchId,
            DepartmentId = request.DepartmentId,
            IsActive = true
        };

        _context.Stores.Add(store);

        await _context.SaveChangesAsync(cancellationToken);

        return MapStoreResponse(store);
    }

    public async Task<StoreResponse> UpdateAsync(
        int id,
        UpdateStoreRequest request,
        CancellationToken cancellationToken = default)
    {
        var store = await _context.Stores
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        if (store is null)
        {
            throw new KeyNotFoundException(
                $"Store with id '{id}' was not found.");
        }

        var name = request.Name.Trim();
        var code = request.Code.Trim();

        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException(
                "Store name is required.",
                nameof(request.Name));
        }

        if (string.IsNullOrWhiteSpace(code))
        {
            throw new ArgumentException(
                "Store code is required.",
                nameof(request.Code));
        }

        var codeExists = await _context.Stores
            .AnyAsync(
                x => x.Id != id &&
                     x.Code == code,
                cancellationToken);

        if (codeExists)
        {
            throw new InvalidOperationException(
                $"A store with code '{code}' already exists.");
        }

        store.Name = name;
        store.Code = code;
        store.ImageUrl = request.ImageUrl;
        store.StoreType = request.StoreType;
        store.ReceiptFormat = request.ReceiptFormat;
        store.PosType = request.PosType;
        store.BuildingLocation = request.BuildingLocation;
        store.RoomLocation = request.RoomLocation;
        store.Email = request.Email;
        store.CellNo = request.CellNo;
        store.Description = request.Description;
        store.BranchId = request.BranchId;
        store.DepartmentId = request.DepartmentId;

        await _context.SaveChangesAsync(cancellationToken);

        return MapStoreResponse(store);
    }

    public async Task DeactivateAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var store = await _context.Stores
            .FirstOrDefaultAsync(
                x => x.Id == id,
                cancellationToken);

        if (store is null)
        {
            throw new KeyNotFoundException(
                $"Store with id '{id}' was not found.");
        }

        if (!store.IsActive)
        {
            return;
        }

        var hasActiveLocations = await _context.StoreLocations
            .AnyAsync(
                x => x.StoreId == id &&
                     x.IsActive,
                cancellationToken);

        if (hasActiveLocations)
        {
            throw new InvalidOperationException(
                "The store cannot be deactivated while it has active locations.");
        }

        store.IsActive = false;

        await _context.SaveChangesAsync(cancellationToken);
    }

    // =========================================================
    // STORE LOCATIONS
    // =========================================================

    public async Task<IReadOnlyList<StoreLocationResponse>> GetLocationsAsync(
        int storeId,
        bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var storeExists = await _context.Stores
            .AnyAsync(
                x => x.Id == storeId,
                cancellationToken);

        if (!storeExists)
        {
            throw new KeyNotFoundException(
                $"Store with id '{storeId}' was not found.");
        }

        var query = _context.StoreLocations
            .AsNoTracking()
            .Where(x => x.StoreId == storeId);

        if (!includeInactive)
        {
            query = query.Where(x => x.IsActive);
        }

        return await query
            .OrderBy(x => x.Type)
            .ThenBy(x => x.Name)
            .Select(x => new StoreLocationResponse
            {
                Id = x.Id,
                StoreId = x.StoreId,
                Type = x.Type,
                Name = x.Name,
                Code = x.Code,
                ParentLocationId = x.ParentLocationId,
                ParentLocationName = x.ParentLocation != null
                    ? x.ParentLocation.Name
                    : null,
                IsActive = x.IsActive,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<StoreLocationResponse> CreateLocationAsync(
        int storeId,
        CreateStoreLocationRequest request,
        CancellationToken cancellationToken = default)
    {
        var storeExists = await _context.Stores
            .AnyAsync(
                x => x.Id == storeId &&
                     x.IsActive,
                cancellationToken);

        if (!storeExists)
        {
            throw new KeyNotFoundException(
                $"Active store with id '{storeId}' was not found.");
        }

        var name = request.Name.Trim();
        var code = request.Code.Trim();

        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException(
                "Location name is required.",
                nameof(request.Name));
        }

        if (string.IsNullOrWhiteSpace(code))
        {
            throw new ArgumentException(
                "Location code is required.",
                nameof(request.Code));
        }

        var codeExists = await _context.StoreLocations
            .AnyAsync(
                x => x.StoreId == storeId &&
                     x.Code == code,
                cancellationToken);

        if (codeExists)
        {
            throw new InvalidOperationException(
                $"A location with code '{code}' already exists in this store.");
        }

        if (request.Type == StoreLocationType.Rack &&
            request.ParentLocationId.HasValue)
        {
            throw new InvalidOperationException(
                "A rack cannot have a parent location.");
        }

        if (request.Type == StoreLocationType.Drawer)
        {
            if (!request.ParentLocationId.HasValue)
            {
                throw new InvalidOperationException(
                    "A drawer must have a rack as its parent.");
            }

            var parentRack = await _context.StoreLocations
                .FirstOrDefaultAsync(
                    x => x.Id == request.ParentLocationId.Value &&
                         x.StoreId == storeId &&
                         x.Type == StoreLocationType.Rack &&
                         x.IsActive,
                    cancellationToken);

            if (parentRack is null)
            {
                throw new InvalidOperationException(
                    "The selected parent location must be an active rack belonging to the same store.");
            }
        }

        var location = new StoreLocation
        {
            StoreId = storeId,
            Type = request.Type,
            Name = name,
            Code = code,
            ParentLocationId = request.ParentLocationId,
            IsActive = true
        };

        _context.StoreLocations.Add(location);

        await _context.SaveChangesAsync(cancellationToken);

        await _context.Entry(location)
            .Reference(x => x.ParentLocation)
            .LoadAsync(cancellationToken);

        return MapLocationResponse(location);
    }

    public async Task<StoreLocationResponse> UpdateLocationAsync(
        int storeId,
        int locationId,
        UpdateStoreLocationRequest request,
        CancellationToken cancellationToken = default)
    {
        var location = await _context.StoreLocations
            .FirstOrDefaultAsync(
                x => x.Id == locationId &&
                     x.StoreId == storeId,
                cancellationToken);

        if (location is null)
        {
            throw new KeyNotFoundException(
                $"Location with id '{locationId}' was not found in store '{storeId}'.");
        }

        var name = request.Name.Trim();
        var code = request.Code.Trim();

        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException(
                "Location name is required.",
                nameof(request.Name));
        }

        if (string.IsNullOrWhiteSpace(code))
        {
            throw new ArgumentException(
                "Location code is required.",
                nameof(request.Code));
        }

        var codeExists = await _context.StoreLocations
            .AnyAsync(
                x => x.Id != locationId &&
                     x.StoreId == storeId &&
                     x.Code == code,
                cancellationToken);

        if (codeExists)
        {
            throw new InvalidOperationException(
                $"A location with code '{code}' already exists in this store.");
        }

        location.Name = name;
        location.Code = code;

        await _context.SaveChangesAsync(cancellationToken);

        await _context.Entry(location)
            .Reference(x => x.ParentLocation)
            .LoadAsync(cancellationToken);

        return MapLocationResponse(location);
    }

    public async Task DeactivateLocationAsync(
        int storeId,
        int locationId,
        CancellationToken cancellationToken = default)
    {
        var location = await _context.StoreLocations
            .FirstOrDefaultAsync(
                x => x.Id == locationId &&
                     x.StoreId == storeId,
                cancellationToken);

        if (location is null)
        {
            throw new KeyNotFoundException(
                $"Location with id '{locationId}' was not found in store '{storeId}'.");
        }

        if (!location.IsActive)
        {
            return;
        }

        if (location.Type == StoreLocationType.Rack)
        {
            var hasActiveChildren = await _context.StoreLocations
                .AnyAsync(
                    x => x.ParentLocationId == locationId &&
                         x.IsActive,
                    cancellationToken);

            if (hasActiveChildren)
            {
                throw new InvalidOperationException(
                    "The rack cannot be deactivated while it has active drawers.");
            }
        }

        location.IsActive = false;

        await _context.SaveChangesAsync(cancellationToken);
    }

    // =========================================================
    // MAPPERS
    // =========================================================

    private static StoreResponse MapStoreResponse(PIMS.Domain.Entities.Store store)
    {
        return new StoreResponse
        {
            Id = store.Id,
            Name = store.Name,
            Code = store.Code,
            ImageUrl = store.ImageUrl,
            StoreType = store.StoreType,
            ReceiptFormat = store.ReceiptFormat,
            PosType = store.PosType,
            BuildingLocation = store.BuildingLocation,
            RoomLocation = store.RoomLocation,
            Email = store.Email,
            CellNo = store.CellNo,
            Description = store.Description,
            BranchId = store.BranchId,
            DepartmentId = store.DepartmentId,
            IsActive = store.IsActive,
            CreatedAt = store.CreatedAt
        };
    }

    private static StoreLocationResponse MapLocationResponse(
        StoreLocation location)
    {
        return new StoreLocationResponse
        {
            Id = location.Id,
            StoreId = location.StoreId,
            Type = location.Type,
            Name = location.Name,
            Code = location.Code,
            ParentLocationId = location.ParentLocationId,
            ParentLocationName = location.ParentLocation?.Name,
            IsActive = location.IsActive,
            CreatedAt = location.CreatedAt
        };
    }
}