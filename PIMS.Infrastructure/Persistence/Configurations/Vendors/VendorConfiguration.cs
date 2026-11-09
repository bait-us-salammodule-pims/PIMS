
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PIMS.Domain.Entities;

namespace PIMS.Infrastructure.Persistence.Configurations.Vendors;

public class VendorConfiguration : IEntityTypeConfiguration<Vendor>
{
    public void Configure(EntityTypeBuilder<Vendor> builder)
    {
        builder.ToTable("vendors");

        builder.HasKey(v => v.Id);

        builder.Property(v => v.Code)
            .HasMaxLength(50)
            .IsRequired();

        builder.HasIndex(v => v.Code)
            .IsUnique();

        builder.Property(v => v.Name)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(v => v.LegalName)
            .HasMaxLength(200);

        builder.Property(v => v.TaxRegistrationNumber)
            .HasMaxLength(100);

        builder.Property(v => v.RegistrationNumber)
            .HasMaxLength(100);

        builder.Property(v => v.Email)
            .HasMaxLength(254);

        builder.Property(v => v.Phone)
            .HasMaxLength(30);

        builder.Property(v => v.Website)
            .HasMaxLength(300);

        builder.Property(v => v.AddressLine1)
            .HasMaxLength(250);

        builder.Property(v => v.AddressLine2)
            .HasMaxLength(250);

        builder.Property(v => v.City)
            .HasMaxLength(100);

        builder.Property(v => v.Province)
            .HasMaxLength(100);

        builder.Property(v => v.Country)
            .HasMaxLength(100);

        builder.Property(v => v.PostalCode)
            .HasMaxLength(20);

        builder.Property(v => v.PaymentTermsDays)
            .IsRequired();

        builder.Property(v => v.Notes)
            .HasMaxLength(2000);

        builder.Property(v => v.ApprovalStatus)
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(v => v.IsActive)
            .IsRequired();

        builder.HasMany(v => v.Contacts)
            .WithOne(c => c.Vendor)
            .HasForeignKey(c => c.VendorId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
