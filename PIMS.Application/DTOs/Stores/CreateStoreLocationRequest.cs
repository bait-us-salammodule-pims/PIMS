using PIMS.Domain.Enums;

namespace PIMS.Application.DTOs.Stores;

public class CreateStoreLocationRequest
{
    public StoreLocationType Type { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;

    public int? ParentLocationId { get; set; }
}