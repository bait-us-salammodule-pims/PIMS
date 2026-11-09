using System.Security.Cryptography.X509Certificates;
using PIMS.Domain.Common;
using PIMS.Domain.Enums;

namespace PIMS.Domain.Entities;

public class Store : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;

    public string? ImageUrl { get; set; }

    public StoreType StoreType { get; set; }

    public ReceiptFormat ReceiptFormat { get; set; }

    public PosType PosType { get; set; }

    public string? BuildingLocation { get; set; }

    public string? RoomLocation { get; set; }

    public string? Email { get; set; }

    public string? CellNo { get; set; }

    public string? Description { get; set; }

    public int? BranchId { get; set; }

    public int? DepartmentId { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<StoreLocation> Locations { get; set; }
        = new List<StoreLocation>();
}