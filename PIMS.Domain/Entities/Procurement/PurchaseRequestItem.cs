using PIMS.Domain.Common;
using PIMS.Domain.Entities.Items;

namespace PIMS.Domain.Entities.Procurement;

public class PurchaseRequestItem : BaseEntity
{
    private PurchaseRequestItem()
    {
    }

    public PurchaseRequestItem(
        int itemId,
        decimal quantity,
        int? unitOfMeasureId = null,
        string? remarks = null)
    {
        SetItemId(itemId);
        SetQuantity(quantity);
        SetUnitOfMeasureId(unitOfMeasureId);
        SetRemarks(remarks);
    }

    public int PurchaseRequestId { get; private set; }

    public PurchaseRequest PurchaseRequest { get; private set; } = null!;

    public int ItemId { get; private set; }

    public Item Item { get; private set; } = null!;

    public decimal Quantity { get; private set; }

    public int? UnitOfMeasureId { get; private set; }

    public UnitOfMeasure? UnitOfMeasure { get; private set; }

    public string? Remarks { get; private set; }

    public void Update(
        decimal quantity,
        int? unitOfMeasureId,
        string? remarks)
    {
        SetQuantity(quantity);
        SetUnitOfMeasureId(unitOfMeasureId);
        SetRemarks(remarks);

        MarkUpdated();
    }

    private void SetItemId(int value)
    {
        if (value <= 0)
            throw new ArgumentException("Item is required.");

        ItemId = value;
    }

    private void SetQuantity(decimal value)
    {
        if (value <= 0)
            throw new ArgumentException(
                "Quantity must be greater than zero.");

        if (value > 999999999999.999999m)
            throw new ArgumentException("Quantity is too large.");

        Quantity = value;
    }

    private void SetUnitOfMeasureId(int? value)
    {
        if (value.HasValue && value.Value <= 0)
            throw new ArgumentException("Unit of measure ID is invalid.");

        UnitOfMeasureId = value;
    }

    private void SetRemarks(string? value)
    {
        value = string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();

        if (value?.Length > 500)
            throw new ArgumentException(
                "Remarks cannot exceed 500 characters.");

        Remarks = value;
    }
}