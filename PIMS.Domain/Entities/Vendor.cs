
using PIMS.Domain.Common;
using PIMS.Domain.Enums;

namespace PIMS.Domain.Entities;

public class Vendor : BaseEntity
{
    public string Code { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public string? LegalName { get; private set; }

    public string? TaxRegistrationNumber { get; private set; }
    public string? RegistrationNumber { get; private set; }

    public string? Email { get; private set; }
    public string? Phone { get; private set; }
    public string? Website { get; private set; }

    public string? AddressLine1 { get; private set; }
    public string? AddressLine2 { get; private set; }
    public string? City { get; private set; }
    public string? Province { get; private set; }
    public string? Country { get; private set; }
    public string? PostalCode { get; private set; }

    public int PaymentTermsDays { get; private set; }
    public string? Notes { get; private set; }

    public VendorApprovalStatus ApprovalStatus { get; private set; }
        = VendorApprovalStatus.PendingApproval;

    public bool IsActive { get; private set; } = true;

    public ICollection<VendorContact> Contacts { get; private set; }
        = new List<VendorContact>();

    private Vendor()
    {
    }

    public Vendor(
        string code,
        string name,
        string? legalName = null,
        string? email = null,
        string? phone = null)
    {
        SetCode(code);
        SetName(name);
        LegalName = Normalize(legalName, 200, nameof(legalName));
        Email = NormalizeEmail(email);
        Phone = Normalize(phone, 30, nameof(phone));
    }

    public void UpdateDetails(
        string code,
        string name,
        string? legalName,
        string? taxRegistrationNumber,
        string? registrationNumber,
        string? email,
        string? phone,
        string? website,
        string? addressLine1,
        string? addressLine2,
        string? city,
        string? province,
        string? country,
        string? postalCode,
        int paymentTermsDays,
        string? notes)
    {
        SetCode(code);
        SetName(name);

        LegalName = Normalize(legalName, 200, nameof(legalName));
        TaxRegistrationNumber = Normalize(
            taxRegistrationNumber, 100, nameof(taxRegistrationNumber));
        RegistrationNumber = Normalize(
            registrationNumber, 100, nameof(registrationNumber));

        Email = NormalizeEmail(email);
        Phone = Normalize(phone, 30, nameof(phone));
        Website = Normalize(website, 300, nameof(website));

        AddressLine1 = Normalize(addressLine1, 250, nameof(addressLine1));
        AddressLine2 = Normalize(addressLine2, 250, nameof(addressLine2));
        City = Normalize(city, 100, nameof(city));
        Province = Normalize(province, 100, nameof(province));
        Country = Normalize(country, 100, nameof(country));
        PostalCode = Normalize(postalCode, 20, nameof(postalCode));

        if (paymentTermsDays < 0 || paymentTermsDays > 365)
        {
            throw new ArgumentException(
                "Payment terms must be between 0 and 365 days.");
        }

        PaymentTermsDays = paymentTermsDays;
        Notes = Normalize(notes, 2000, nameof(notes));

        MarkUpdated();
    }

    public void Approve()
    {
        if (!IsActive)
            throw new InvalidOperationException(
                "An inactive vendor cannot be approved.");

        if (ApprovalStatus == VendorApprovalStatus.Blocked)
            throw new InvalidOperationException(
                "A blocked vendor cannot be approved.");

        ApprovalStatus = VendorApprovalStatus.Approved;
        MarkUpdated();
    }

    public void Block()
    {
        ApprovalStatus = VendorApprovalStatus.Blocked;
        MarkUpdated();
    }

    public void Activate()
    {
        if (IsActive)
            return;

        IsActive = true;
        MarkUpdated();
    }

    public void Deactivate()
    {
        if (!IsActive)
            return;

        IsActive = false;
        MarkUpdated();
    }

    private void SetCode(string code)
    {
        Code = NormalizeRequired(code, 50, nameof(code))
            .ToUpperInvariant();
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

    public void SetInitialDetails(
    string? taxRegistrationNumber,
    string? registrationNumber,
    string? website,
    string? addressLine1,
    string? addressLine2,
    string? city,
    string? province,
    string? country,
    string? postalCode,
    int paymentTermsDays,
    string? notes)
    {
        TaxRegistrationNumber = Normalize(
            taxRegistrationNumber, 100, nameof(taxRegistrationNumber));

        RegistrationNumber = Normalize(
            registrationNumber, 100, nameof(registrationNumber));

        Website = Normalize(website, 300, nameof(website));
        AddressLine1 = Normalize(addressLine1, 250, nameof(addressLine1));
        AddressLine2 = Normalize(addressLine2, 250, nameof(addressLine2));
        City = Normalize(city, 100, nameof(city));
        Province = Normalize(province, 100, nameof(province));
        Country = Normalize(country, 100, nameof(country));
        PostalCode = Normalize(postalCode, 20, nameof(postalCode));

        if (paymentTermsDays < 0 || paymentTermsDays > 365)
            throw new ArgumentException(
                "Payment terms must be between 0 and 365 days.");

        PaymentTermsDays = paymentTermsDays;
        Notes = Normalize(notes, 2000, nameof(notes));
    }
}
