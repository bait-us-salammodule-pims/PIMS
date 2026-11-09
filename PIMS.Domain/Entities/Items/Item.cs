using PIMS.Domain.Common;

namespace PIMS.Domain.Entities.Items;

public class Item : BaseEntity
{
    public string ItemCode { get; private set; } = string.Empty;

    public string Name { get; private set; } = string.Empty;

    public string? Description { get; private set; }

    public string? Barcode { get; private set; }

    public int CategoryId { get; private set; }

    public ItemCategory? Category { get; private set; }

    public bool IsActive { get; private set; } = true;

    private Item()
    {
    }

    public Item(
        string itemCode,
        string name,
        int categoryId,
        string? description = null,
        string? barcode = null)
    {
        SetItemCode(itemCode);
        SetName(name);
        SetCategoryId(categoryId);
        Description = NormalizeDescription(description);
        Barcode = NormalizeBarcode(barcode);
    }

    public void Update(
        string itemCode,
        string name,
        int categoryId,
        string? description,
        string? barcode,
        bool isActive)
    {
        SetItemCode(itemCode);
        SetName(name);
        SetCategoryId(categoryId);

        Description = NormalizeDescription(description);
        Barcode = NormalizeBarcode(barcode);
        IsActive = isActive;

        MarkUpdated();
    }

    private void SetItemCode(string itemCode)
    {
        if (string.IsNullOrWhiteSpace(itemCode))
        {
            throw new ArgumentException("Item code is required.");
        }

        itemCode = itemCode.Trim().ToUpperInvariant();

        if (itemCode.Length > 50)
        {
            throw new ArgumentException(
                "Item code cannot exceed 50 characters.");
        }

        ItemCode = itemCode;
    }

    private void SetName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Item name is required.");
        }

        name = name.Trim();

        if (name.Length > 200)
        {
            throw new ArgumentException(
                "Item name cannot exceed 200 characters.");
        }

        Name = name;
    }

    private void SetCategoryId(int categoryId)
    {
        if (categoryId <= 0)
        {
            throw new ArgumentException(
                "A valid item category is required.");
        }

        CategoryId = categoryId;
    }

    private static string? NormalizeDescription(string? description)
    {
        if (string.IsNullOrWhiteSpace(description))
        {
            return null;
        }

        description = description.Trim();

        if (description.Length > 1000)
        {
            throw new ArgumentException(
                "Description cannot exceed 1000 characters.");
        }

        return description;
    }

    private static string? NormalizeBarcode(string? barcode)
    {
        if (string.IsNullOrWhiteSpace(barcode))
        {
            return null;
        }

        barcode = barcode.Trim();

        if (barcode.Length > 100)
        {
            throw new ArgumentException(
                "Barcode cannot exceed 100 characters.");
        }

        return barcode;
    }
}