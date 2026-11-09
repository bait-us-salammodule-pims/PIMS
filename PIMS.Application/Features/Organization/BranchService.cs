using PIMS.Application.Common;
using PIMS.Application.DTOs.Organization;
using PIMS.Application.Interfaces;
using PIMS.Application.Interfaces.Organization;
using PIMS.Domain.Entities.Organization;

namespace PIMS.Application.Features.Organization;

public class BranchService
{
    private readonly IBranchRepository _repository;
    private readonly IHeadOfficeRepository _headOfficeRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUserService;

    public BranchService(
        IBranchRepository repository,
        IHeadOfficeRepository headOfficeRepository,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService)
    {
        _repository = repository;
        _headOfficeRepository = headOfficeRepository;
        _unitOfWork = unitOfWork;
        _currentUserService = currentUserService;
    }

    public async Task<List<BranchDto>> GetAllAsync(
        int? headOfficeId = null,
        bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var entities = await _repository.GetAllAsync(
            headOfficeId,
            includeInactive,
            cancellationToken);

        return entities.Select(Map).ToList();
    }

    public async Task<BranchDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(
            id,
            cancellationToken);

        return entity == null ? null : Map(entity);
    }

    public async Task<Result<BranchDto>> CreateAsync(
        BranchDto dto,
        CancellationToken cancellationToken = default)
    {
        if (dto.HeadOfficeId <= 0)
        {
            return Result<BranchDto>.Failure(
                "Valid head office is required.");
        }

        if (string.IsNullOrWhiteSpace(dto.Code))
        {
            return Result<BranchDto>.Failure(
                "Branch code is required.");
        }

        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return Result<BranchDto>.Failure(
                "Branch name is required.");
        }

        var headOffice = await _headOfficeRepository.GetByIdAsync(
            dto.HeadOfficeId,
            cancellationToken);

        if (headOffice == null)
        {
            return Result<BranchDto>.Failure(
                "Head office not found.");
        }

        if (!headOffice.IsActive)
        {
            return Result<BranchDto>.Failure(
                "Cannot create branch under an inactive head office.");
        }

        var code = dto.Code.Trim().ToUpperInvariant();

        if (await _repository.ExistsByCodeAsync(
                dto.HeadOfficeId,
                code,
                null,
                cancellationToken))
        {
            return Result<BranchDto>.Failure(
                "Branch code already exists under this head office.");
        }

        var entity = new Branch
        {
            HeadOfficeId = dto.HeadOfficeId,
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

        entity.HeadOffice = headOffice;

        return Result<BranchDto>.Success(
            Map(entity));
    }

    public async Task<Result<BranchDto>> UpdateAsync(
        int id,
        BranchDto dto,
        CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(
            id,
            cancellationToken);

        if (entity == null)
        {
            return Result<BranchDto>.Failure(
                "Branch not found.");
        }

        if (string.IsNullOrWhiteSpace(dto.Code))
        {
            return Result<BranchDto>.Failure(
                "Branch code is required.");
        }

        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return Result<BranchDto>.Failure(
                "Branch name is required.");
        }

        var code = dto.Code.Trim().ToUpperInvariant();

        if (await _repository.ExistsByCodeAsync(
                entity.HeadOfficeId,
                code,
                id,
                cancellationToken))
        {
            return Result<BranchDto>.Failure(
                "Branch code already exists under this head office.");
        }

        entity.Code = code;
        entity.Name = dto.Name.Trim();
        entity.Address = dto.Address?.Trim();
        entity.Phone = dto.Phone?.Trim();
        entity.Email = dto.Email?.Trim();

        await _unitOfWork.SaveChangesAsync(
            cancellationToken);

        return Result<BranchDto>.Success(
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
                "Branch not found.");
        }

        if (!entity.IsActive)
        {
            return Result.Success();
        }

        if (await _repository.HasActiveDepartmentsAsync(
                id,
                cancellationToken))
        {
            return Result.Failure(
                "Cannot deactivate branch while active departments exist.");
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
                "Branch not found.");
        }

        var headOffice = await _headOfficeRepository.GetByIdAsync(
            entity.HeadOfficeId,
            cancellationToken);

        if (headOffice == null || !headOffice.IsActive)
        {
            return Result.Failure(
                "Cannot activate branch because its head office is inactive or unavailable.");
        }

        entity.IsActive = true;

        await _unitOfWork.SaveChangesAsync(
            cancellationToken);

        return Result.Success();
    }

    private static BranchDto Map(Branch entity)
    {
        return new BranchDto
        {
            Id = entity.Id,
            HeadOfficeId = entity.HeadOfficeId,
            HeadOfficeName = entity.HeadOffice?.Name ?? string.Empty,
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