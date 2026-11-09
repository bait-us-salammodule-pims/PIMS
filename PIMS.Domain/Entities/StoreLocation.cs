using PIMS.Domain.Common;
using PIMS.Domain.Enums;

namespace PIMS.Domain.Entities;

public class StoreLocation : BaseEntity
{
    public int StoreId { get; set; }

    public StoreLocationType Type { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;

    public int? ParentLocationId { get; set; }

    public bool IsActive { get; set; } = true;

    public Store Store { get; set; } = null!;

    public StoreLocation? ParentLocation { get; set; }

    public ICollection<StoreLocation> Children { get; set; }
        = new List<StoreLocation>();
}