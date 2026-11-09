
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PIMS.Domain.Entities.Inventory;

namespace PIMS.Infrastructure.Persistence.Configurations.Inventory;

public sealed class InventoryBalanceConfiguration
    : IEntityTypeConfiguration<InventoryBalance>
{
    public void Configure(EntityTypeBuilder<InventoryBalance> builder)
    {
        builder.ToTable("inventory_balances");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.QuantityOnHand)
            .HasPrecision(18, 6)
            .IsRequired();

        builder.Property(x => x.QuantityReserved)
            .HasPrecision(18, 6)
            .IsRequired();

        builder.HasOne(x => x.Store)
            .WithMany()
            .HasForeignKey(x => x.StoreId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Item)
            .WithMany()
            .HasForeignKey(x => x.ItemId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.StoreId, x.ItemId })
            .IsUnique();

        builder.HasIndex(x => x.ItemId);
    }
}
