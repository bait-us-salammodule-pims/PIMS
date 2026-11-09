using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PIMS.Domain.Entities.Procurement;

namespace PIMS.Infrastructure.Persistence.Configurations.Procurement;

public sealed class GoodsReceiptItemConfiguration
    : IEntityTypeConfiguration<GoodsReceiptItem>
{
    public void Configure(EntityTypeBuilder<GoodsReceiptItem> builder)
    {
        builder.ToTable("goods_receipt_items");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.ReceivedQuantity)
            .HasPrecision(18, 6)
            .IsRequired();

        builder.Property(x => x.AcceptedQuantity)
            .HasPrecision(18, 6)
            .IsRequired();

        builder.Property(x => x.RejectedQuantity)
            .HasPrecision(18, 6)
            .IsRequired();

        builder.Property(x => x.RejectionReason)
            .HasMaxLength(500);

        builder.Property(x => x.Remarks)
            .HasMaxLength(500);

        builder.HasOne(x => x.GoodsReceipt)
            .WithMany(x => x.Items)
            .HasForeignKey(x => x.GoodsReceiptId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.PurchaseOrderItem)
            .WithMany()
            .HasForeignKey(x => x.PurchaseOrderItemId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new
        {
            x.GoodsReceiptId,
            x.PurchaseOrderItemId
        }).IsUnique();

        builder.HasIndex(x => x.PurchaseOrderItemId);
    }
}