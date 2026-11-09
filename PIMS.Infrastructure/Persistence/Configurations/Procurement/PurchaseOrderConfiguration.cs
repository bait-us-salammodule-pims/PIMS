
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PIMS.Domain.Entities.Procurement;

namespace PIMS.Infrastructure.Persistence.Configurations.Procurement;

public sealed class PurchaseOrderConfiguration
    : IEntityTypeConfiguration<PurchaseOrder>
{
    public void Configure(EntityTypeBuilder<PurchaseOrder> builder)
    {
        builder.ToTable("purchase_orders");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.OrderNumber)
            .HasMaxLength(50)
            .IsRequired();

        builder.HasIndex(x => x.OrderNumber)
            .IsUnique();

        builder.Property(x => x.OrderDate)
            .HasColumnType("timestamp with time zone")
            .IsRequired();

        builder.Property(x => x.ExpectedDeliveryDate)
            .HasColumnType("timestamp with time zone")
            .IsRequired();

        builder.Property(x => x.Notes)
            .HasMaxLength(2000);

        builder.Property(x => x.Status)
            .HasConversion<int>()
            .IsRequired()
            .HasDefaultValue(PIMS.Domain.Enums.PurchaseOrderStatus.Draft);

        builder.HasOne(x => x.PurchaseRequest)
            .WithMany()
            .HasForeignKey(x => x.PurchaseRequestId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.QuotationRequest)
            .WithMany()
            .HasForeignKey(x => x.QuotationRequestId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.VendorQuotation)
            .WithMany()
            .HasForeignKey(x => x.VendorQuotationId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Vendor)
            .WithMany()
            .HasForeignKey(x => x.VendorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.PurchaseRequestId);
        builder.HasIndex(x => x.QuotationRequestId);
        builder.HasIndex(x => x.VendorQuotationId);
        builder.HasIndex(x => x.VendorId);
        builder.HasIndex(x => x.Status);

        builder.HasMany(x => x.Items)
            .WithOne(x => x.PurchaseOrder)
            .HasForeignKey(x => x.PurchaseOrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Ignore(x => x.Subtotal);
        builder.Ignore(x => x.TaxAmount);
        builder.Ignore(x => x.TotalAmount);
    }
}
