
using PIMS.Domain.Common;

namespace PIMS.Domain.Entities.Items;

public class PackageType : BaseEntity
{
    public string Name { get; private set; } = string.Empty;

    public string Code { get; private set; } = string.Empty;

    public string? Description { get; private set; }

    public bool IsActive { get; private set; } = true;

    private PackageType()
    {
    }

    public PackageType(
        string name,
        string code,
        string? description = null)
    {
        SetName(name);
        SetCode(code);
        Description = NormalizeDescription(description);
    }

    public void Update(
        string name,
        string code,
        string? description,
        bool isActive)
    {
        SetName(name);
        SetCode(code);
        Description = NormalizeDescription(description);
        IsActive = isActive;

        MarkUpdated();
    }

    private void SetName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException(
                "Package type name is required.");

        name = name.Trim();

        if (name.Length > 100)
            throw new ArgumentException(
                "Package type name cannot exceed 100 characters.");

        Name = name;
    }

    private void SetCode(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new ArgumentException(
                "Package type code is required.");

        code = code.Trim().ToUpperInvariant();

        if (code.Length > 20)
            throw new ArgumentException(
                "Package type code cannot exceed 20 characters.");

        Code = code;
    }

    private static string? NormalizeDescription(string? description)
    {
        if (string.IsNullOrWhiteSpace(description))
            return null;

        description = description.Trim();

        if (description.Length > 500)
            throw new ArgumentException(
                "Description cannot exceed 500 characters.");

        return description;
    }
}
