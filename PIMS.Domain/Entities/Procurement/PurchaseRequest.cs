using PIMS.Domain.Common;
using PIMS.Domain.Entities.Auth;
using PIMS.Domain.Entities.Organization;
using PIMS.Domain.Enums;

namespace PIMS.Domain.Entities.Procurement;

public class PurchaseRequest : BaseEntity
{
    private PurchaseRequest()
    {
    }

    public PurchaseRequest(
        string requestNumber,
        int requestedByUserId,
        int departmentId,
        DateTime requiredDate,
        string justification,
        int? subDepartmentId = null)
    {
        SetRequestNumber(requestNumber);
        SetRequestedByUserId(requestedByUserId);
        SetDepartmentId(departmentId);
        SetSubDepartmentId(subDepartmentId);
        SetRequiredDate(requiredDate);
        SetJustification(justification);

        Status = PurchaseRequestStatus.Draft;
        Items = new List<PurchaseRequestItem>();
    }

    public string RequestNumber { get; private set; } = string.Empty;

    public int RequestedByUserId { get; private set; }

    public User RequestedBy { get; private set; } = null!;

    public int DepartmentId { get; private set; }

    public Department Department { get; private set; } = null!;

    public int? SubDepartmentId { get; private set; }

    public SubDepartment? SubDepartment { get; private set; }

    public DateTime RequiredDate { get; private set; }

    public string Justification { get; private set; } = string.Empty;

    public PurchaseRequestStatus Status { get; private set; }

    public ICollection<PurchaseRequestItem> Items { get; private set; }
        = new List<PurchaseRequestItem>();

    public void UpdateDetails(
        int departmentId,
        DateTime requiredDate,
        string justification,
        int? subDepartmentId)
    {
        EnsureDraft();

        SetDepartmentId(departmentId);
        SetSubDepartmentId(subDepartmentId);
        SetRequiredDate(requiredDate);
        SetJustification(justification);

        MarkUpdated();
    }

    public void AddItem(PurchaseRequestItem item)
    {
        EnsureDraft();

        ArgumentNullException.ThrowIfNull(item);

        Items.Add(item);
        MarkUpdated();
    }

    public void Submit()
    {
        EnsureDraft();

        if (Items.Count == 0)
            throw new InvalidOperationException(
                "At least one item is required before submission.");

        Status = PurchaseRequestStatus.Submitted;
        MarkUpdated();
    }

    public void StartReview()
    {
        if (Status != PurchaseRequestStatus.Submitted)
            throw new InvalidOperationException(
                "Only submitted requests can enter review.");

        Status = PurchaseRequestStatus.UnderReview;
        MarkUpdated();
    }

    public void Approve()
    {
        if (Status != PurchaseRequestStatus.UnderReview)
            throw new InvalidOperationException(
                "Only requests under review can be approved.");

        Status = PurchaseRequestStatus.Approved;
        MarkUpdated();
    }

    public void Reject()
    {
        if (Status != PurchaseRequestStatus.UnderReview)
            throw new InvalidOperationException(
                "Only requests under review can be rejected.");

        Status = PurchaseRequestStatus.Rejected;
        MarkUpdated();
    }

    public void Cancel()
    {
        if (Status is PurchaseRequestStatus.Approved
            or PurchaseRequestStatus.Rejected
            or PurchaseRequestStatus.Cancelled)
        {
            throw new InvalidOperationException(
                "This request cannot be cancelled.");
        }

        Status = PurchaseRequestStatus.Cancelled;
        MarkUpdated();
    }

    private void EnsureDraft()
    {
        if (Status != PurchaseRequestStatus.Draft)
            throw new InvalidOperationException(
                "Only draft requests can be modified.");
    }

    private void SetRequestNumber(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("Request number is required.");

        value = value.Trim().ToUpperInvariant();

        if (value.Length > 50)
            throw new ArgumentException(
                "Request number cannot exceed 50 characters.");

        RequestNumber = value;
    }

    private void SetRequestedByUserId(int value)
    {
        if (value <= 0)
            throw new ArgumentException("Requester is required.");

        RequestedByUserId = value;
    }

    private void SetDepartmentId(int value)
    {
        if (value <= 0)
            throw new ArgumentException("Department is required.");

        DepartmentId = value;
    }

    private void SetSubDepartmentId(int? value)
    {
        if (value.HasValue && value.Value <= 0)
            throw new ArgumentException("Sub-department ID is invalid.");

        SubDepartmentId = value;
    }

    private void SetRequiredDate(DateTime value)
    {
        if (value == default)
            throw new ArgumentException("Required date is required.");

        RequiredDate = value;
    }

    private void SetJustification(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("Justification is required.");

        value = value.Trim();

        if (value.Length > 2000)
            throw new ArgumentException(
                "Justification cannot exceed 2000 characters.");

        Justification = value;
    }
}