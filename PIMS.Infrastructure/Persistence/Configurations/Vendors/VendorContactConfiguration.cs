using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PIMS.Domain.Entities;

namespace PIMS.Infrastructure.Persistence.Configurations.Vendors;

public class VendorContactConfiguration
    : IEntityTypeConfiguration<VendorContact>
{
    public void Configure(EntityTypeBuilder<VendorContact> builder)
    {
        builder.ToTable("vendor_contacts");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.VendorId)
            .IsRequired();

        builder.Property(c => c.Name)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(c => c.Designation)
            .HasMaxLength(100);

        builder.Property(c => c.Email)
            .HasMaxLength(254);

        builder.Property(c => c.Phone)
            .HasMaxLength(30);

        builder.Property(c => c.IsPrimary)
            .IsRequired();

        builder.Property(c => c.IsActive)
            .IsRequired();

        // Index for looking up contacts by vendor.
        builder.HasIndex(c => c.VendorId);

        // Only one active primary contact per vendor.
        builder.HasIndex(c => c.VendorId)
            .IsUnique()
            .HasFilter("\"IsPrimary\" = TRUE AND \"IsActive\" = TRUE");
    }
}