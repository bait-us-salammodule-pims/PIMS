
using PIMS.Domain.Common;

namespace PIMS.Domain.Entities;

public class VendorContact : BaseEntity
{
    public int VendorId { get; private set; }

    public string Name { get; private set; } = string.Empty;
    public string? Designation { get; private set; }
    public string? Email { get; private set; }
    public string? Phone { get; private set; }

    public bool IsPrimary { get; private set; }
    public bool IsActive { get; private set; } = true;

    public Vendor Vendor { get; private set; } = null!;

    private VendorContact()
    {
    }

    public VendorContact(
        int vendorId,
        string name,
        string? designation = null,
        string? email = null,
        string? phone = null,
        bool isPrimary = false)
    {
        SetVendorId(vendorId);
        SetName(name);

        Designation = Normalize(designation, 100, nameof(designation));
        Email = NormalizeEmail(email);
        Phone = Normalize(phone, 30, nameof(phone));
        IsPrimary = isPrimary;
    }

    public void UpdateDetails(
        string name,
        string? designation,
        string? email,
        string? phone,
        bool isPrimary)
    {
        SetName(name);

        Designation = Normalize(designation, 100, nameof(designation));
        Email = NormalizeEmail(email);
        Phone = Normalize(phone, 30, nameof(phone));
        IsPrimary = isPrimary;

        MarkUpdated();
    }

    public void Deactivate()
    {
        if (!IsActive)
            return;

        IsActive = false;
        IsPrimary = false;
        MarkUpdated();
    }

    public void Activate()
    {
        if (IsActive)
            return;

        IsActive = true;
        MarkUpdated();
    }

    private void SetVendorId(int vendorId)
    {
        if (vendorId <= 0)
            throw new ArgumentException("A valid vendor is required.");

        VendorId = vendorId;
    }

    private void SetName(string name)
    {
        Name = NormalizeRequired(name, 200, nameof(name));
    }

    private static string NormalizeRequired(
        string? value, int maxLength, string field)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException($"{field} is required.");

        value = value.Trim();

        if (value.Length > maxLength)
            throw new ArgumentException(
                $"{field} cannot exceed {maxLength} characters.");

        return value;
    }

    private static string? Normalize(
        string? value, int maxLength, string field)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        value = value.Trim();

        if (value.Length > maxLength)
            throw new ArgumentException(
                $"{field} cannot exceed {maxLength} characters.");

        return value;
    }

    private static string? NormalizeEmail(string? email)
    {
        email = Normalize(email, 254, nameof(email));

        if (email is not null &&
            (!System.Net.Mail.MailAddress.TryCreate(email, out var address)
             || !string.Equals(
                 address.Address, email,
                 StringComparison.OrdinalIgnoreCase)))
        {
            throw new ArgumentException("A valid email address is required.");
        }

        return email;
    }

    public void SetPrimary(bool isPrimary)
    {
        if (!IsActive && isPrimary)
            throw new InvalidOperationException(
                "An inactive contact cannot be primary.");

        if (IsPrimary == isPrimary)
            return;

        IsPrimary = isPrimary;
        MarkUpdated();
    }
}
