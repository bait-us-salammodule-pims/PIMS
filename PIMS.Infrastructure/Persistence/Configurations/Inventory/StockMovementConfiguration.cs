
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PIMS.Domain.Entities.Inventory;
using PIMS.Domain.Enums;

namespace PIMS.Infrastructure.Persistence.Configurations.Inventory;

public sealed class StockMovementConfiguration
    : IEntityTypeConfiguration<StockMovement>
{
    public void Configure(EntityTypeBuilder<StockMovement> builder)
    {
        builder.ToTable("stock_movements");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.MovementType)
            .HasConversion<int>()
            .IsRequired();

        builder.Property(x => x.Quantity)
            .HasPrecision(18, 6)
            .IsRequired();

        builder.Property(x => x.MovementDate)
            .HasColumnType("timestamp with time zone")
            .IsRequired();

        builder.Property(x => x.ReferenceType)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(x => x.ReferenceNumber)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.Notes)
            .HasMaxLength(1000);

        builder.HasOne(x => x.Store)
            .WithMany()
            .HasForeignKey(x => x.StoreId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Item)
            .WithMany()
            .HasForeignKey(x => x.ItemId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.StoreId, x.ItemId, x.MovementDate });

        builder.HasIndex(x => new { x.ReferenceType, x.ReferenceNumber })
         .IsUnique();
    }
}
