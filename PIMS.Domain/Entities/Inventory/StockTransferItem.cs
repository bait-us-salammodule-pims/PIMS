using PIMS.Domain.Entities.Items;
namespace PIMS.Domain.Entities.Inventory;

public sealed class StockTransferItem
{
    public int Id { get; private set; }

    public int StockTransferId { get; private set; }

    public int ItemId { get; private set; }

    public Item Item { get; private set; } = null!;

    public decimal RequestedQuantity { get; private set; }

    public decimal DispatchedQuantity { get; private set; }

    public decimal ReceivedQuantity { get; private set; }

    public string? Notes { get; private set; }

    private StockTransferItem()
    {
    }

    public StockTransferItem(
        int itemId,
        decimal requestedQuantity,
        string? notes = null)
    {
        if (itemId <= 0)
            throw new ArgumentException("Item ID must be valid.");

        if (requestedQuantity <= 0)
            throw new ArgumentException(
                "Requested quantity must be greater than zero.");

        if (notes?.Length > 500)
            throw new ArgumentException(
                "Notes cannot exceed 500 characters.");

        ItemId = itemId;
        RequestedQuantity = requestedQuantity;
        DispatchedQuantity = 0;
        ReceivedQuantity = 0;
        Notes = notes?.Trim();
    }

    public void RecordDispatch(decimal quantity)
    {
        if (quantity <= 0)
            throw new ArgumentException(
                "Dispatched quantity must be greater than zero.");

        if (DispatchedQuantity + quantity > RequestedQuantity)
            throw new InvalidOperationException(
                "Dispatched quantity cannot exceed requested quantity.");

        DispatchedQuantity += quantity;
    }

    public void RecordReceipt(decimal quantity)
    {
        if (quantity <= 0)
            throw new ArgumentException(
                "Received quantity must be greater than zero.");

        if (ReceivedQuantity + quantity > DispatchedQuantity)
            throw new InvalidOperationException(
                "Received quantity cannot exceed dispatched quantity.");

        ReceivedQuantity += quantity;
    }
}
