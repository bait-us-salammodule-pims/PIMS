
using PIMS.Domain.Common;
using PIMS.Domain.Entities.Items;

namespace PIMS.Domain.Entities.Inventory;

public class InventoryBalance : BaseEntity
{
    private InventoryBalance()
    {
    }

    public InventoryBalance(int storeId, int itemId)
    {
        if (storeId <= 0)
            throw new ArgumentException("Store ID is invalid.");

        if (itemId <= 0)
            throw new ArgumentException("Item ID is invalid.");

        StoreId = storeId;
        ItemId = itemId;
        QuantityOnHand = 0m;
        QuantityReserved = 0m;
    }

    public int StoreId { get; private set; }

    public PIMS.Domain.Entities.Store Store { get; private set; } = null!;

    public int ItemId { get; private set; }

    public Item Item { get; private set; } = null!;

    public decimal QuantityOnHand { get; private set; }

    public decimal QuantityReserved { get; private set; }

    public decimal AvailableQuantity => QuantityOnHand - QuantityReserved;

    public void AddStock(decimal quantity)
    {
        if (quantity <= 0)
            throw new ArgumentException("Stock quantity must be greater than zero.");

        QuantityOnHand += quantity;
        MarkUpdated();
    }

    public void RemoveStock(decimal quantity)
    {
        if (quantity <= 0)
            throw new ArgumentException("Stock quantity must be greater than zero.");

        if (quantity > AvailableQuantity)
            throw new InvalidOperationException("Insufficient available stock.");

        QuantityOnHand -= quantity;
        MarkUpdated();
    }

    public void ReserveStock(decimal quantity)
    {
        if (quantity <= 0)
            throw new ArgumentException("Reserved quantity must be greater than zero.");

        if (quantity > AvailableQuantity)
            throw new InvalidOperationException("Insufficient available stock to reserve.");

        QuantityReserved += quantity;
        MarkUpdated();
    }

    public void ReleaseReservation(decimal quantity)
    {
        if (quantity <= 0)
            throw new ArgumentException("Released quantity must be greater than zero.");

        if (quantity > QuantityReserved)
            throw new InvalidOperationException("Released quantity exceeds reserved stock.");

        QuantityReserved -= quantity;
        MarkUpdated();
    }
}
