
using Microsoft.EntityFrameworkCore;
using PIMS.Application.DTOs.Vendors;
using PIMS.Application.Interfaces.Vendors;
using PIMS.Domain.Entities;
using PIMS.Infrastructure.Persistence;

namespace PIMS.Infrastructure.Services.Vendors;

public class VendorService : IVendorService
{
    private readonly PimsDbContext _context;

    public VendorService(PimsDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<VendorDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        var vendors = await _context.Vendors
            .AsNoTracking()
            .OrderBy(v => v.Name)
            .ToListAsync(cancellationToken);

        return vendors.Select(MapToDto).ToList();
    }

    public async Task<VendorDto?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var vendor = await _context.Vendors
            .AsNoTracking()
            .FirstOrDefaultAsync(
                v => v.Id == id, cancellationToken);

        return vendor is null ? null : MapToDto(vendor);
    }

    public async Task<VendorDto> CreateAsync(
        CreateVendorDto request,
        CancellationToken cancellationToken = default)
    {
        var code = request.Code.Trim().ToUpperInvariant();

        var codeExists = await _context.Vendors
            .AnyAsync(v => v.Code == code, cancellationToken);

        if (codeExists)
        {
            throw new InvalidOperationException(
                "Vendor code already exists.");
        }

        var vendor = new Vendor(
            request.Code,
            request.Name,
            request.LegalName,
            request.Email,
            request.Phone);

        vendor.SetInitialDetails(
            request.TaxRegistrationNumber,
            request.RegistrationNumber,
            request.Website,
            request.AddressLine1,
            request.AddressLine2,
            request.City,
            request.Province,
            request.Country,
            request.PostalCode,
            request.PaymentTermsDays,
            request.Notes);

        _context.Vendors.Add(vendor);

        await _context.SaveChangesAsync(cancellationToken);

        return MapToDto(vendor);
    }

    public async Task<VendorDto?> UpdateAsync(
        int id,
        UpdateVendorDto request,
        CancellationToken cancellationToken = default)
    {
        var vendor = await _context.Vendors
            .FirstOrDefaultAsync(
                v => v.Id == id, cancellationToken);

        if (vendor is null)
            return null;

        var code = request.Code.Trim().ToUpperInvariant();

        var codeExists = await _context.Vendors
            .AnyAsync(
                v => v.Id != id && v.Code == code,
                cancellationToken);

        if (codeExists)
        {
            throw new InvalidOperationException(
                "Vendor code already exists.");
        }

        vendor.UpdateDetails(
            request.Code,
            request.Name,
            request.LegalName,
            request.TaxRegistrationNumber,
            request.RegistrationNumber,
            request.Email,
            request.Phone,
            request.Website,
            request.AddressLine1,
            request.AddressLine2,
            request.City,
            request.Province,
            request.Country,
            request.PostalCode,
            request.PaymentTermsDays,
            request.Notes);

        await _context.SaveChangesAsync(cancellationToken);

        return MapToDto(vendor);
    }

    public async Task<bool> DeleteAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var vendor = await _context.Vendors
            .FirstOrDefaultAsync(
                v => v.Id == id, cancellationToken);

        if (vendor is null)
            return false;

        vendor.Deactivate();

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }


    private static VendorDto MapToDto(Vendor vendor)
    {
        return new VendorDto
        {
            Id = vendor.Id,
            Code = vendor.Code,
            Name = vendor.Name,
            LegalName = vendor.LegalName,
            TaxRegistrationNumber = vendor.TaxRegistrationNumber,
            RegistrationNumber = vendor.RegistrationNumber,
            Email = vendor.Email,
            Phone = vendor.Phone,
            Website = vendor.Website,
            AddressLine1 = vendor.AddressLine1,
            AddressLine2 = vendor.AddressLine2,
            City = vendor.City,
            Province = vendor.Province,
            Country = vendor.Country,
            PostalCode = vendor.PostalCode,
            PaymentTermsDays = vendor.PaymentTermsDays,
            Notes = vendor.Notes,
            ApprovalStatus = vendor.ApprovalStatus,
            IsActive = vendor.IsActive,
            CreatedAt = vendor.CreatedAt,
            UpdatedAt = vendor.UpdatedAt
        };
    }


    public async Task<bool> ActivateAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var vendor = await _context.Vendors
            .FirstOrDefaultAsync(
                v => v.Id == id,
                cancellationToken);

        if (vendor is null)
            return false;

        if (!vendor.IsActive)
        {
            vendor.Activate();

            await _context.SaveChangesAsync(cancellationToken);
        }

        return true;
    }

    public async Task<bool> ApproveAsync(
    int id,
    CancellationToken cancellationToken = default)
    {
        var vendor = await _context.Vendors
            .FirstOrDefaultAsync(
                v => v.Id == id,
                cancellationToken);

        if (vendor is null)
            return false;

        vendor.Approve();

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }

    public async Task<bool> BlockAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var vendor = await _context.Vendors
            .FirstOrDefaultAsync(
                v => v.Id == id,
                cancellationToken);

        if (vendor is null)
            return false;

        vendor.Block();

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }

}
