using PIMS.Application.Common;
using PIMS.Application.DTOs.Organization;
using PIMS.Application.Interfaces;
using PIMS.Application.Interfaces.Organization;
using PIMS.Domain.Entities.Organization;

namespace PIMS.Application.Features.Organization;

public class HeadOfficeService
{
    private readonly IHeadOfficeRepository _repository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUserService;

    public HeadOfficeService(
        IHeadOfficeRepository repository,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
        _currentUserService = currentUserService;
    }

    public async Task<List<HeadOfficeDto>> GetAllAsync(
        bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var entities = await _repository.GetAllAsync(
            includeInactive,
            cancellationToken);

        return entities.Select(Map).ToList();
    }

    public async Task<HeadOfficeDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(
            id,
            cancellationToken);

        return entity == null ? null : Map(entity);
    }

    public async Task<Result<HeadOfficeDto>> CreateAsync(
        HeadOfficeDto dto,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Code))
        {
            return Result<HeadOfficeDto>.Failure(
                "Head office code is required.");
        }

        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return Result<HeadOfficeDto>.Failure(
                "Head office name is required.");
        }

        var code = dto.Code.Trim().ToUpperInvariant();

        if (await _repository.ExistsByCodeAsync(
                code,
                null,
                cancellationToken))
        {
            return Result<HeadOfficeDto>.Failure(
                "Head office code already exists.");
        }

        var entity = new HeadOffice
        {
            Code = code,
            Name = dto.Name.Trim(),
            Address = dto.Address?.Trim(),
            Phone = dto.Phone?.Trim(),
            Email = dto.Email?.Trim(),
            IsActive = true
        };

        await _repository.AddAsync(
            entity,
            cancellationToken);

        await _unitOfWork.SaveChangesAsync(
            cancellationToken);

        return Result<HeadOfficeDto>.Success(
            Map(entity));
    }

    public async Task<Result<HeadOfficeDto>> UpdateAsync(
        int id,
        HeadOfficeDto dto,
        CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(
            id,
            cancellationToken);

        if (entity == null)
        {
            return Result<HeadOfficeDto>.Failure(
                "Head office not found.");
        }

        if (string.IsNullOrWhiteSpace(dto.Code))
        {
            return Result<HeadOfficeDto>.Failure(
                "Head office code is required.");
        }

        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return Result<HeadOfficeDto>.Failure(
                "Head office name is required.");
        }

        var code = dto.Code.Trim().ToUpperInvariant();

        if (await _repository.ExistsByCodeAsync(
                code,
                id,
                cancellationToken))
        {
            return Result<HeadOfficeDto>.Failure(
                "Head office code already exists.");
        }

        entity.Code = code;
        entity.Name = dto.Name.Trim();
        entity.Address = dto.Address?.Trim();
        entity.Phone = dto.Phone?.Trim();
        entity.Email = dto.Email?.Trim();

        await _unitOfWork.SaveChangesAsync(
            cancellationToken);

        return Result<HeadOfficeDto>.Success(
            Map(entity));
    }

    public async Task<Result> DeactivateAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(
            id,
            cancellationToken);

        if (entity == null)
        {
            return Result.Failure(
                "Head office not found.");
        }

        if (!entity.IsActive)
        {
            return Result.Success();
        }

        if (await _repository.HasActiveBranchesAsync(
                id,
                cancellationToken))
        {
            return Result.Failure(
                "Cannot deactivate head office while active branches exist.");
        }

        entity.IsActive = false;

        await _unitOfWork.SaveChangesAsync(
            cancellationToken);

        return Result.Success();
    }

    public async Task<Result> ActivateAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(
            id,
            cancellationToken);

        if (entity == null)
        {
            return Result.Failure(
                "Head office not found.");
        }

        entity.IsActive = true;

        await _unitOfWork.SaveChangesAsync(
            cancellationToken);

        return Result.Success();
    }

    private static HeadOfficeDto Map(HeadOffice entity)
    {
        return new HeadOfficeDto
        {
            Id = entity.Id,
            Code = entity.Code,
            Name = entity.Name,
            Address = entity.Address,
            Phone = entity.Phone,
            Email = entity.Email,
            IsActive = entity.IsActive,
            CreatedAt = entity.CreatedAt
        };
    }
}