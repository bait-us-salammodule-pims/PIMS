
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PIMS.Domain.Entities;

namespace PIMS.Infrastructure.Persistence.Configurations.Vendors;

public class VendorItemPriceConfiguration
    : IEntityTypeConfiguration<VendorItemPrice>
{
    public void Configure(EntityTypeBuilder<VendorItemPrice> builder)
    {
        builder.ToTable("vendor_item_prices", table =>
        {
            table.HasCheckConstraint(
                "CK_vendor_item_prices_UnitPrice",
                "\"UnitPrice\" >= 0");

            table.HasCheckConstraint(
                "CK_vendor_item_prices_MinimumOrderQuantity",
                "\"MinimumOrderQuantity\" > 0");

            table.HasCheckConstraint(
                "CK_vendor_item_prices_EffectiveDates",
                "\"EffectiveTo\" IS NULL OR \"EffectiveTo\" >= \"EffectiveFrom\"");
        });

        builder.HasKey(p => p.Id);

        builder.Property(p => p.VendorId)
            .IsRequired();

        builder.Property(p => p.ItemId)
            .IsRequired();

        builder.Property(p => p.UnitPrice)
            .HasPrecision(18, 4)
            .IsRequired();

        builder.Property(p => p.CurrencyCode)
            .HasMaxLength(3)
            .IsRequired();

        builder.Property(p => p.MinimumOrderQuantity)
            .HasPrecision(18, 4)
            .IsRequired();

        builder.Property(p => p.EffectiveFrom)
            .IsRequired();

        builder.Property(p => p.EffectiveTo);

        builder.Property(p => p.IsActive)
            .IsRequired();

        builder.HasOne(p => p.Vendor)
            .WithMany()
            .HasForeignKey(p => p.VendorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(p => p.Item)
            .WithMany()
            .HasForeignKey(p => p.ItemId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(p => p.VendorId);

        builder.HasIndex(p => p.ItemId);

        builder.HasIndex(p => new
        {
            p.VendorId,
            p.ItemId,
            p.IsActive
        });
    }
}
