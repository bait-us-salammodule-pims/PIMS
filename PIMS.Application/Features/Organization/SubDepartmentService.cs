using PIMS.Application.Common;
using PIMS.Application.DTOs.Organization;
using PIMS.Application.Interfaces;
using PIMS.Application.Interfaces.Organization;
using PIMS.Domain.Entities.Organization;

namespace PIMS.Application.Features.Organization;

public class SubDepartmentService
{
    private readonly ISubDepartmentRepository _repository;
    private readonly IDepartmentRepository _departmentRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUserService;

    public SubDepartmentService(
        ISubDepartmentRepository repository,
        IDepartmentRepository departmentRepository,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService)
    {
        _repository = repository;
        _departmentRepository = departmentRepository;
        _unitOfWork = unitOfWork;
        _currentUserService = currentUserService;
    }

    public async Task<List<SubDepartmentDto>> GetAllAsync(
        int? departmentId = null,
        bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var entities = await _repository.GetAllAsync(
            departmentId,
            includeInactive,
            cancellationToken);

        return entities.Select(Map).ToList();
    }

    public async Task<SubDepartmentDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(
            id,
            cancellationToken);

        return entity == null ? null : Map(entity);
    }

    public async Task<Result<SubDepartmentDto>> CreateAsync(
        SubDepartmentDto dto,
        CancellationToken cancellationToken = default)
    {
        if (dto.DepartmentId <= 0)
        {
            return Result<SubDepartmentDto>.Failure(
                "Valid department is required.");
        }

        if (string.IsNullOrWhiteSpace(dto.Code))
        {
            return Result<SubDepartmentDto>.Failure(
                "Sub-department code is required.");
        }

        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return Result<SubDepartmentDto>.Failure(
                "Sub-department name is required.");
        }

        var department = await _departmentRepository.GetByIdAsync(
            dto.DepartmentId,
            cancellationToken);

        if (department == null)
        {
            return Result<SubDepartmentDto>.Failure(
                "Department not found.");
        }

        if (!department.IsActive)
        {
            return Result<SubDepartmentDto>.Failure(
                "Cannot create sub-department under an inactive department.");
        }

        var code = dto.Code.Trim().ToUpperInvariant();

        if (await _repository.ExistsByCodeAsync(
                dto.DepartmentId,
                code,
                null,
                cancellationToken))
        {
            return Result<SubDepartmentDto>.Failure(
                "Sub-department code already exists under this department.");
        }

        var entity = new SubDepartment
        {
            DepartmentId = dto.DepartmentId,
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

        entity.Department = department;

        return Result<SubDepartmentDto>.Success(
            Map(entity));
    }

    public async Task<Result<SubDepartmentDto>> UpdateAsync(
        int id,
        SubDepartmentDto dto,
        CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(
            id,
            cancellationToken);

        if (entity == null)
        {
            return Result<SubDepartmentDto>.Failure(
                "Sub-department not found.");
        }

        if (string.IsNullOrWhiteSpace(dto.Code))
        {
            return Result<SubDepartmentDto>.Failure(
                "Sub-department code is required.");
        }

        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return Result<SubDepartmentDto>.Failure(
                "Sub-department name is required.");
        }

        var code = dto.Code.Trim().ToUpperInvariant();

        if (await _repository.ExistsByCodeAsync(
                entity.DepartmentId,
                code,
                id,
                cancellationToken))
        {
            return Result<SubDepartmentDto>.Failure(
                "Sub-department code already exists under this department.");
        }

        entity.Code = code;
        entity.Name = dto.Name.Trim();
        entity.Description = dto.Description?.Trim();

        await _unitOfWork.SaveChangesAsync(
            cancellationToken);

        return Result<SubDepartmentDto>.Success(
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
                "Sub-department not found.");
        }

        if (!entity.IsActive)
        {
            return Result.Success();
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
                "Sub-department not found.");
        }

        var department = await _departmentRepository.GetByIdAsync(
            entity.DepartmentId,
            cancellationToken);

        if (department == null || !department.IsActive)
        {
            return Result.Failure(
                "Cannot activate sub-department because its department is inactive or unavailable.");
        }

        entity.IsActive = true;

        await _unitOfWork.SaveChangesAsync(
            cancellationToken);

        return Result.Success();
    }

    private static SubDepartmentDto Map(SubDepartment entity)
    {
        return new SubDepartmentDto
        {
            Id = entity.Id,
            DepartmentId = entity.DepartmentId,
            DepartmentName = entity.Department?.Name ?? string.Empty,
            Code = entity.Code,
            Name = entity.Name,
            Description = entity.Description,
            IsActive = entity.IsActive,
            CreatedAt = entity.CreatedAt
        };
    }
}