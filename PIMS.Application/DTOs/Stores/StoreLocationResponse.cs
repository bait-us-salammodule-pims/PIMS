using PIMS.Domain.Enums;

namespace PIMS.Application.DTOs.Stores;

public class StoreLocationResponse
{
    public int Id { get; set; }

    public int StoreId { get; set; }

    public StoreLocationType Type { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;

    public int? ParentLocationId { get; set; }

    public string? ParentLocationName { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }
}