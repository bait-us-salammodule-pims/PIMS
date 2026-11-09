
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PIMS.Domain.Entities.Items;

namespace PIMS.Infrastructure.Persistence.Configurations.Items;

public class ItemPricingConfiguration
    : IEntityTypeConfiguration<ItemPricing>
{
    public void Configure(EntityTypeBuilder<ItemPricing> builder)
    {
        builder.ToTable("item_pricing");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
            .UseIdentityByDefaultColumn();

        builder.Property(x => x.ItemId)
            .IsRequired();

        builder.Property(x => x.UnitPrice)
            .HasPrecision(14, 2)
            .IsRequired();

        builder.Property(x => x.CurrencyCode)
            .HasMaxLength(3)
            .IsRequired()
            .HasDefaultValue("PKR");

        builder.Property(x => x.EffectiveFrom)
            .IsRequired();

        builder.Property(x => x.EffectiveTo);

        builder.Property(x => x.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(x => x.CreatedAt)
            .IsRequired();

        builder.Property(x => x.UpdatedAt);

        builder.HasIndex(x => x.ItemId);

        builder.HasIndex(x => new
        {
            x.ItemId,
            x.CurrencyCode,
            x.EffectiveFrom
        });

        builder.HasOne(x => x.Item)
            .WithMany()
            .HasForeignKey(x => x.ItemId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.ToTable("item_pricing", table =>
        {
            table.HasCheckConstraint(
                "CK_item_pricing_UnitPrice",
                "\"UnitPrice\" >= 0");

            table.HasCheckConstraint(
                "CK_item_pricing_EffectiveDates",
                "\"EffectiveTo\" IS NULL OR \"EffectiveTo\" >= \"EffectiveFrom\"");
        });
    }
}
