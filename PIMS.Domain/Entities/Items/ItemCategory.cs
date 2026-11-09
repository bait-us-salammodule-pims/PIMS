using PIMS.Domain.Common;

namespace PIMS.Domain.Entities.Items;

public class ItemCategory : BaseEntity
{
    public string Name { get; private set; } = string.Empty;

    public string Code { get; private set; } = string.Empty;

    public string? Description { get; private set; }

    public int? ParentCategoryId { get; private set; }

    public ItemCategory? ParentCategory { get; private set; }

    public ICollection<ItemCategory> SubCategories { get; private set; }
        = new List<ItemCategory>();

    public bool IsActive { get; private set; } = true;

    private ItemCategory()
    {
    }

    public ItemCategory(
        string name,
        string code,
        string? description = null,
        int? parentCategoryId = null)
    {
        SetName(name);
        SetCode(code);
        Description = NormalizeOptionalText(description);
        ParentCategoryId = parentCategoryId;
    }

    public void Update(
        string name,
        string code,
        string? description,
        bool isActive)
    {
        SetName(name);
        SetCode(code);
        Description = NormalizeOptionalText(description);
        IsActive = isActive;
        MarkUpdated();
    }

    public void SetParentCategory(int? parentCategoryId)
    {
        if (parentCategoryId == Id && Id != 0)
        {
            throw new ArgumentException(
                "A category cannot be its own parent.");
        }

        ParentCategoryId = parentCategoryId;
        MarkUpdated();
    }

    private void SetName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Category name is required.");
        }

        name = name.Trim();

        if (name.Length > 150)
        {
            throw new ArgumentException(
                "Category name cannot exceed 150 characters.");
        }

        Name = name;
    }

    private void SetCode(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            throw new ArgumentException("Category code is required.");
        }

        code = code.Trim().ToUpperInvariant();

        if (code.Length > 50)
        {
            throw new ArgumentException(
                "Category code cannot exceed 50 characters.");
        }

        Code = code;
    }

    private static string? NormalizeOptionalText(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        value = value.Trim();

        if (value.Length > 500)
        {
            throw new ArgumentException(
                "Description cannot exceed 500 characters.");
        }

        return value;
    }
}