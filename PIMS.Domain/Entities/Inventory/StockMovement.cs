
using PIMS.Domain.Common;
using PIMS.Domain.Entities.Items;
using PIMS.Domain.Enums;

namespace PIMS.Domain.Entities.Inventory;

public class StockMovement : BaseEntity
{
    private StockMovement()
    {
    }

    public StockMovement(
        int storeId,
        int itemId,
        StockMovementType movementType,
        decimal quantity,
        string referenceType,
        string referenceNumber,
        string? notes = null)
    {
        if (storeId <= 0)
            throw new ArgumentException("Store ID is invalid.");

        if (itemId <= 0)
            throw new ArgumentException("Item ID is invalid.");

        if (quantity <= 0)
            throw new ArgumentException("Movement quantity must be greater than zero.");

        if (string.IsNullOrWhiteSpace(referenceType))
            throw new ArgumentException("Reference type is required.");

        if (string.IsNullOrWhiteSpace(referenceNumber))
            throw new ArgumentException("Reference number is required.");

        if (referenceType.Trim().Length > 50)
            throw new ArgumentException("Reference type cannot exceed 50 characters.");

        if (referenceNumber.Trim().Length > 100)
            throw new ArgumentException("Reference number cannot exceed 100 characters.");

        if (notes?.Trim().Length > 1000)
            throw new ArgumentException("Notes cannot exceed 1000 characters.");

        StoreId = storeId;
        ItemId = itemId;
        MovementType = movementType;
        Quantity = quantity;
        ReferenceType = referenceType.Trim();
        ReferenceNumber = referenceNumber.Trim();
        Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
        MovementDate = DateTime.UtcNow;
    }

    public int StoreId { get; private set; }

    public PIMS.Domain.Entities.Store Store { get; private set; } = null!;

    public int ItemId { get; private set; }

    public Item Item { get; private set; } = null!;

    public StockMovementType MovementType { get; private set; }

    public decimal Quantity { get; private set; }

    public DateTime MovementDate { get; private set; }

    public string ReferenceType { get; private set; } = string.Empty;

    public string ReferenceNumber { get; private set; } = string.Empty;

    public string? Notes { get; private set; }
}
