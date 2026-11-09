
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PIMS.Domain.Entities.Inventory;
using PIMS.Domain.Entities.Items;

namespace PIMS.Infrastructure.Persistence.Configurations.Inventory;

public sealed class StockTransferItemConfiguration
    : IEntityTypeConfiguration<StockTransferItem>
{
    public void Configure(EntityTypeBuilder<StockTransferItem> builder)
    {
        builder.ToTable("stock_transfer_items");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.RequestedQuantity)
            .HasPrecision(18, 6)
            .IsRequired();

        builder.Property(x => x.DispatchedQuantity)
            .HasPrecision(18, 6)
            .IsRequired();

        builder.Property(x => x.ReceivedQuantity)
            .HasPrecision(18, 6)
            .IsRequired();

        builder.Property(x => x.Notes)
            .HasMaxLength(500);

        builder.HasOne(x => x.Item)
            .WithMany()
            .HasForeignKey(x => x.ItemId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new
        {
            x.StockTransferId,
            x.ItemId
        }).IsUnique();
    }
}
