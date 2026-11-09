
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PIMS.Domain.Entities.Inventory;

namespace PIMS.Infrastructure.Persistence.Configurations.Inventory;

public sealed class StockTransferConfiguration
    : IEntityTypeConfiguration<StockTransfer>
{
    public void Configure(EntityTypeBuilder<StockTransfer> builder)
    {
        builder.ToTable("stock_transfers");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.TransferNumber)
            .HasMaxLength(50)
            .IsRequired();

        builder.HasIndex(x => x.TransferNumber)
            .IsUnique();

        builder.Property(x => x.Status)
            .HasConversion<int>()
            .IsRequired();

        builder.Property(x => x.RequestedBy)
            .HasMaxLength(200);

        builder.Property(x => x.ApprovedBy)
            .HasMaxLength(200);

        builder.Property(x => x.Notes)
            .HasMaxLength(1000);

        builder.Property(x => x.TransferDate)
            .HasColumnType("timestamp with time zone")
            .IsRequired();

        builder.Property(x => x.ApprovedAt)
            .HasColumnType("timestamp with time zone");

        builder.Property(x => x.DispatchedAt)
            .HasColumnType("timestamp with time zone");

        builder.Property(x => x.ReceivedAt)
            .HasColumnType("timestamp with time zone");

        builder.Property(x => x.CreatedAt)
            .HasColumnType("timestamp with time zone")
            .IsRequired();

        builder.Property(x => x.UpdatedAt)
            .HasColumnType("timestamp with time zone");

        builder.HasOne(x => x.SourceStore)
        .WithMany()
        .HasForeignKey(x => x.SourceStoreId)
        .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.DestinationStore)
            .WithMany()
            .HasForeignKey(x => x.DestinationStoreId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(x => x.Items)
            .WithOne()
            .HasForeignKey(x => x.StockTransferId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
