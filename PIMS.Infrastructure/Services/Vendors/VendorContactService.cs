using Microsoft.EntityFrameworkCore;
using PIMS.Application.DTOs.Vendors;
using PIMS.Application.Interfaces.Vendors;
using PIMS.Domain.Entities;
using PIMS.Infrastructure.Persistence;

namespace PIMS.Infrastructure.Services.Vendors;

public class VendorContactService : IVendorContactService
{
    private readonly PimsDbContext _context;

    public VendorContactService(PimsDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<VendorContactDto>> GetAllAsync(
        int vendorId,
        CancellationToken cancellationToken = default)
    {
        var vendorExists = await _context.Vendors
            .AnyAsync(v => v.Id == vendorId, cancellationToken);

        if (!vendorExists)
            return Array.Empty<VendorContactDto>();

        var contacts = await _context.VendorContacts
            .AsNoTracking()
            .Where(c => c.VendorId == vendorId)
            .OrderByDescending(c => c.IsPrimary)
            .ThenBy(c => c.Name)
            .ToListAsync(cancellationToken);

        return contacts.Select(MapToDto).ToList();
    }

    public async Task<VendorContactDto?> GetByIdAsync(
        int vendorId,
        int contactId,
        CancellationToken cancellationToken = default)
    {
        var contact = await _context.VendorContacts
            .AsNoTracking()
            .FirstOrDefaultAsync(
                c => c.VendorId == vendorId && c.Id == contactId,
                cancellationToken);

        return contact is null ? null : MapToDto(contact);
    }

    public async Task<VendorContactDto?> CreateAsync(
        int vendorId,
        CreateVendorContactDto request,
        CancellationToken cancellationToken = default)
    {
        var vendor = await _context.Vendors
            .FirstOrDefaultAsync(
                v => v.Id == vendorId, cancellationToken);

        if (vendor is null)
            return null;

        await using var transaction =
            await _context.Database.BeginTransactionAsync(cancellationToken);

        if (request.IsPrimary)
        {
            var currentPrimary = await _context.VendorContacts
                .Where(c => c.VendorId == vendorId
                    && c.IsPrimary && c.IsActive)
                .ToListAsync(cancellationToken);

            foreach (var contact in currentPrimary)
                contact.SetPrimary(false);
        }

        var newContact = new VendorContact(
            vendorId,
            request.Name,
            request.Designation,
            request.Email,
            request.Phone,
            request.IsPrimary);

        _context.VendorContacts.Add(newContact);

        await _context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return MapToDto(newContact);
    }

    public async Task<VendorContactDto?> UpdateAsync(
        int vendorId,
        int contactId,
        UpdateVendorContactDto request,
        CancellationToken cancellationToken = default)
    {
        var contact = await _context.VendorContacts
            .FirstOrDefaultAsync(
                c => c.VendorId == vendorId && c.Id == contactId,
                cancellationToken);

        if (contact is null)
            return null;

        await using var transaction =
            await _context.Database.BeginTransactionAsync(cancellationToken);

        if (request.IsPrimary)
        {
            var currentPrimary = await _context.VendorContacts
                .Where(c => c.VendorId == vendorId
                    && c.Id != contactId
                    && c.IsPrimary && c.IsActive)
                .ToListAsync(cancellationToken);

            foreach (var primary in currentPrimary)
                primary.SetPrimary(false);
        }

        contact.UpdateDetails(
            request.Name,
            request.Designation,
            request.Email,
            request.Phone,
            request.IsPrimary);

        await _context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return MapToDto(contact);
    }

    public async Task<bool> DeactivateAsync(
        int vendorId,
        int contactId,
        CancellationToken cancellationToken = default)
    {
        var contact = await _context.VendorContacts
            .FirstOrDefaultAsync(
                c => c.VendorId == vendorId && c.Id == contactId,
                cancellationToken);

        if (contact is null)
            return false;

        contact.Deactivate();

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> ActivateAsync(
        int vendorId,
        int contactId,
        CancellationToken cancellationToken = default)
    {
        var contact = await _context.VendorContacts
            .FirstOrDefaultAsync(
                c => c.VendorId == vendorId && c.Id == contactId,
                cancellationToken);

        if (contact is null)
            return false;

        contact.Activate();

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static VendorContactDto MapToDto(VendorContact contact)
    {
        return new VendorContactDto
        {
            Id = contact.Id,
            VendorId = contact.VendorId,
            Name = contact.Name,
            Designation = contact.Designation,
            Email = contact.Email,
            Phone = contact.Phone,
            IsPrimary = contact.IsPrimary,
            IsActive = contact.IsActive,
            CreatedAt = contact.CreatedAt,
            UpdatedAt = contact.UpdatedAt
        };
    }
}