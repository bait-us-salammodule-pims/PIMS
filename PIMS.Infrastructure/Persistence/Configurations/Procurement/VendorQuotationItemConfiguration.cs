
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PIMS.Domain.Entities.Procurement;

namespace PIMS.Infrastructure.Persistence.Configurations.Procurement;

public sealed class VendorQuotationItemConfiguration
    : IEntityTypeConfiguration<VendorQuotationItem>
{
    public void Configure(EntityTypeBuilder<VendorQuotationItem> builder)
    {
        builder.ToTable("vendor_quotation_items");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Quantity)
            .HasPrecision(18, 6)
            .IsRequired();

        builder.Property(x => x.UnitPrice)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(x => x.TaxPercentage)
            .HasPrecision(5, 2)
            .IsRequired();

        builder.Ignore(x => x.LineTotal);

        builder.Property(x => x.Remarks)
            .HasMaxLength(500);

        builder.HasOne(x => x.VendorQuotation)
            .WithMany(x => x.Items)
            .HasForeignKey(x => x.VendorQuotationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.PurchaseRequestItem)
            .WithMany()
            .HasForeignKey(x => x.PurchaseRequestItemId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new
        {
            x.VendorQuotationId,
            x.PurchaseRequestItemId
        })
            .IsUnique();
    }
}
