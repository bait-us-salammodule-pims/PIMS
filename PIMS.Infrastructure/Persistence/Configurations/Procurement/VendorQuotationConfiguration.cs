
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PIMS.Domain.Entities.Procurement;

namespace PIMS.Infrastructure.Persistence.Configurations.Procurement;

public sealed class VendorQuotationConfiguration
    : IEntityTypeConfiguration<VendorQuotation>
{
    public void Configure(EntityTypeBuilder<VendorQuotation> builder)
    {
        builder.ToTable("vendor_quotations");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.VendorQuotationNumber)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.SubmittedAt)
            .IsRequired();

        builder.Property(x => x.ValidUntil)
            .IsRequired();

        builder.Property(x => x.Notes)
            .HasMaxLength(2000);

        builder.Property(x => x.IsSelected)
            .IsRequired()
            .HasDefaultValue(false);

        builder.HasOne(x => x.QuotationRequest)
            .WithMany(x => x.VendorQuotations)
            .HasForeignKey(x => x.QuotationRequestId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Vendor)
            .WithMany()
            .HasForeignKey(x => x.VendorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new
        {
            x.QuotationRequestId,
            x.VendorId
        })
            .IsUnique();

        builder.HasIndex(x => new
        {
            x.QuotationRequestId,
            x.IsSelected
        })
            .HasFilter("\"IsSelected\" = TRUE")
            .IsUnique();
    }
}
