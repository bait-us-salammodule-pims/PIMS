
using PIMS.Domain.Enums;
using PIMS.Domain.Entities;

namespace PIMS.Domain.Entities.Inventory;

public sealed class StockTransfer
{
    public int Id { get; private set; }

    public string TransferNumber { get; private set; } = string.Empty;

    public int SourceStoreId { get; private set; }

    public int DestinationStoreId { get; private set; }
    public Store SourceStore { get; private set; } = null!;

    public Store DestinationStore { get; private set; } = null!;
    public DateTime TransferDate { get; private set; }

    public StockTransferStatus Status { get; private set; }

    public string? RequestedBy { get; private set; }

    public string? ApprovedBy { get; private set; }

    public DateTime? ApprovedAt { get; private set; }

    public DateTime? DispatchedAt { get; private set; }

    public DateTime? ReceivedAt { get; private set; }

    public string? Notes { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public DateTime? UpdatedAt { get; private set; }

    public ICollection<StockTransferItem> Items { get; private set; }
        = new List<StockTransferItem>();

    private StockTransfer()
    {
    }

    public StockTransfer(
        string transferNumber,
        int sourceStoreId,
        int destinationStoreId,
        string? requestedBy,
        string? notes)
    {
        if (string.IsNullOrWhiteSpace(transferNumber))
            throw new ArgumentException("Transfer number is required.");

        if (transferNumber.Length > 50)
            throw new ArgumentException(
                "Transfer number cannot exceed 50 characters.");

        if (sourceStoreId <= 0 || destinationStoreId <= 0)
            throw new ArgumentException("Both store IDs must be valid.");

        if (sourceStoreId == destinationStoreId)
            throw new ArgumentException(
                "Source and destination stores must be different.");

        if (requestedBy?.Length > 200)
            throw new ArgumentException(
                "Requested by cannot exceed 200 characters.");

        if (notes?.Length > 1000)
            throw new ArgumentException(
                "Notes cannot exceed 1000 characters.");

        TransferNumber = transferNumber.Trim();
        SourceStoreId = sourceStoreId;
        DestinationStoreId = destinationStoreId;
        RequestedBy = requestedBy?.Trim();
        Notes = notes?.Trim();
        TransferDate = DateTime.UtcNow;
        Status = StockTransferStatus.Draft;
        CreatedAt = DateTime.UtcNow;
    }

    public void AddItem(StockTransferItem item)
    {
        if (Status != StockTransferStatus.Draft)
            throw new InvalidOperationException(
                "Items can only be added to draft transfers.");

        if (item is null)
            throw new ArgumentNullException(nameof(item));

        if (Items.Any(x => x.ItemId == item.ItemId))
            throw new InvalidOperationException(
                "This item already exists in the transfer.");

        Items.Add(item);
        MarkUpdated();
    }

    public void Submit()
    {
        if (Status != StockTransferStatus.Draft)
            throw new InvalidOperationException(
                "Only draft transfers can be submitted.");

        if (Items.Count == 0)
            throw new InvalidOperationException(
                "At least one item is required before submission.");

        Status = StockTransferStatus.Submitted;
        MarkUpdated();
    }

    public void Approve(string approvedBy)
    {
        if (Status != StockTransferStatus.Submitted)
            throw new InvalidOperationException(
                "Only submitted transfers can be approved.");

        if (string.IsNullOrWhiteSpace(approvedBy))
            throw new ArgumentException("Approver is required.");

        if (approvedBy.Length > 200)
            throw new ArgumentException(
                "Approver cannot exceed 200 characters.");

        ApprovedBy = approvedBy.Trim();
        ApprovedAt = DateTime.UtcNow;
        Status = StockTransferStatus.Approved;
        MarkUpdated();
    }

    public void Reject()
    {
        if (Status != StockTransferStatus.Submitted)
            throw new InvalidOperationException(
                "Only submitted transfers can be rejected.");

        Status = StockTransferStatus.Rejected;
        MarkUpdated();
    }

    public void MarkDispatched()
    {
        if (Status != StockTransferStatus.Approved)
            throw new InvalidOperationException(
                "Only approved transfers can be dispatched.");

        DispatchedAt = DateTime.UtcNow;
        Status = StockTransferStatus.Dispatched;
        MarkUpdated();
    }

    public void MarkReceived()
    {
        if (Status != StockTransferStatus.Dispatched)
            throw new InvalidOperationException(
                "Only dispatched transfers can be received.");

        ReceivedAt = DateTime.UtcNow;
        Status = StockTransferStatus.Received;
        MarkUpdated();
    }

    public void Cancel()
    {
        if (Status != StockTransferStatus.Draft &&
            Status != StockTransferStatus.Submitted &&
            Status != StockTransferStatus.Approved)
        {
            throw new InvalidOperationException(
                "This transfer can no longer be cancelled.");
        }

        Status = StockTransferStatus.Cancelled;
        MarkUpdated();
    }

    public void UpdateNotes(string? notes)
    {
        if (Status != StockTransferStatus.Draft)
            throw new InvalidOperationException(
                "Notes can only be updated while the transfer is in draft.");

        if (notes?.Length > 1000)
            throw new ArgumentException(
                "Notes cannot exceed 1000 characters.");

        Notes = notes?.Trim();
        MarkUpdated();
    }

    private void MarkUpdated()
    {
        UpdatedAt = DateTime.UtcNow;
    }
}
