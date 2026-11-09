
namespace PIMS.Application.DTOs.Items;

public sealed record ItemPricingDto(
    int Id,
    int ItemId,
    string ItemCode,
    string ItemName,
    decimal UnitPrice,
    string CurrencyCode,
    DateTime EffectiveFrom,
    DateTime? EffectiveTo,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public sealed record CreateItemPricingDto(
    int ItemId,
    decimal UnitPrice,
    string CurrencyCode,
    DateTime EffectiveFrom,
    DateTime? EffectiveTo);

public sealed record UpdateItemPricingDto(
    decimal UnitPrice,
    string CurrencyCode,
    DateTime EffectiveFrom,
    DateTime? EffectiveTo,
    bool IsActive);
