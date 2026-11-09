using PIMS.Application.Common;
using PIMS.Application.DTOs.Organization;
using PIMS.Application.Interfaces;
using PIMS.Application.Interfaces.Organization;
using PIMS.Domain.Entities.Organization;

namespace PIMS.Application.Features.Organization;

public class DepartmentService
{
    private readonly IDepartmentRepository _repository;
    private readonly IBranchRepository _branchRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUserService;

    public DepartmentService(
        IDepartmentRepository repository,
        IBranchRepository branchRepository,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService)
    {
        _repository = repository;
        _branchRepository = branchRepository;
        _unitOfWork = unitOfWork;
        _currentUserService = currentUserService;
    }

    public async Task<List<DepartmentDto>> GetAllAsync(
        int? branchId = null,
        bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var entities = await _repository.GetAllAsync(
            branchId,
            includeInactive,
            cancellationToken);

        return entities.Select(Map).ToList();
    }

    public async Task<DepartmentDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(
            id,
            cancellationToken);

        return entity == null ? null : Map(entity);
    }

    public async Task<Result<DepartmentDto>> CreateAsync(
        DepartmentDto dto,
        CancellationToken cancellationToken = default)
    {
        if (dto.BranchId <= 0)
        {
            return Result<DepartmentDto>.Failure(
                "Valid branch is required.");
        }

        if (string.IsNullOrWhiteSpace(dto.Code))
        {
            return Result<DepartmentDto>.Failure(
                "Department code is required.");
        }

        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return Result<DepartmentDto>.Failure(
                "Department name is required.");
        }

        var branch = await _branchRepository.GetByIdAsync(
            dto.BranchId,
            cancellationToken);

        if (branch == null)
        {
            return Result<DepartmentDto>.Failure(
                "Branch not found.");
        }

        if (!branch.IsActive)
        {
            return Result<DepartmentDto>.Failure(
                "Cannot create department under an inactive branch.");
        }

        var code = dto.Code.Trim().ToUpperInvariant();

        if (await _repository.ExistsByCodeAsync(
                dto.BranchId,
                code,
                null,
                cancellationToken))
        {
            return Result<DepartmentDto>.Failure(
                "Department code already exists under this branch.");
        }

        var entity = new Department
        {
            BranchId = dto.BranchId,
            Code = code,
            Name = dto.Name.Trim(),
            Description = dto.Description?.Trim(),
            IsActive = true
        };

        await _repository.AddAsync(
            entity,
            cancellationToken);

        await _unitOfWork.SaveChangesAsync(
            cancellationToken);

        entity.Branch = branch;

        return Result<DepartmentDto>.Success(
            Map(entity));
    }

    public async Task<Result<DepartmentDto>> UpdateAsync(
        int id,
        DepartmentDto dto,
        CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(
            id,
            cancellationToken);

        if (entity == null)
        {
            return Result<DepartmentDto>.Failure(
                "Department not found.");
        }

        if (string.IsNullOrWhiteSpace(dto.Code))
        {
            return Result<DepartmentDto>.Failure(
                "Department code is required.");
        }

        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return Result<DepartmentDto>.Failure(
                "Department name is required.");
        }

        var code = dto.Code.Trim().ToUpperInvariant();

        if (await _repository.ExistsByCodeAsync(
                entity.BranchId,
                code,
                id,
                cancellationToken))
        {
            return Result<DepartmentDto>.Failure(
                "Department code already exists under this branch.");
        }

        entity.Code = code;
        entity.Name = dto.Name.Trim();
        entity.Description = dto.Description?.Trim();

        await _unitOfWork.SaveChangesAsync(
            cancellationToken);

        return Result<DepartmentDto>.Success(
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
                "Department not found.");
        }

        if (!entity.IsActive)
        {
            return Result.Success();
        }

        if (await _repository.HasActiveSubDepartmentsAsync(
                id,
                cancellationToken))
        {
            return Result.Failure(
                "Cannot deactivate department while active sub-departments exist.");
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
                "Department not found.");
        }

        var branch = await _branchRepository.GetByIdAsync(
            entity.BranchId,
            cancellationToken);

        if (branch == null || !branch.IsActive)
        {
            return Result.Failure(
                "Cannot activate department because its branch is inactive or unavailable.");
        }

        entity.IsActive = true;

        await _unitOfWork.SaveChangesAsync(
            cancellationToken);

        return Result.Success();
    }

    private static DepartmentDto Map(Department entity)
    {
        return new DepartmentDto
        {
            Id = entity.Id,
            BranchId = entity.BranchId,
            BranchName = entity.Branch?.Name ?? string.Empty,
            Code = entity.Code,
            Name = entity.Name,
            Description = entity.Description,
            IsActive = entity.IsActive,
            CreatedAt = entity.CreatedAt
        };
    }
}