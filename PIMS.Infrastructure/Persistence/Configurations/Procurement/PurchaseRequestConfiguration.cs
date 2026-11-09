
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PIMS.Domain.Entities.Procurement;

namespace PIMS.Infrastructure.Persistence.Configurations.Procurement;

public class PurchaseRequestConfiguration
    : IEntityTypeConfiguration<PurchaseRequest>
{
    public void Configure(EntityTypeBuilder<PurchaseRequest> builder)
    {
        builder.ToTable("purchase_requests");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.RequestNumber)
            .IsRequired()
            .HasMaxLength(50);

        builder.HasIndex(x => x.RequestNumber)
            .IsUnique();

        builder.Property(x => x.RequiredDate)
            .IsRequired()
            .HasColumnType("timestamp with time zone");

        builder.Property(x => x.Justification)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(x => x.Status)
            .IsRequired()
            .HasConversion<int>()
            .HasDefaultValue(
                PIMS.Domain.Enums.PurchaseRequestStatus.Draft);

        builder.HasOne(x => x.RequestedBy)
            .WithMany()
            .HasForeignKey(x => x.RequestedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Department)
            .WithMany()
            .HasForeignKey(x => x.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.SubDepartment)
            .WithMany()
            .HasForeignKey(x => x.SubDepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.RequestedByUserId);
        builder.HasIndex(x => x.DepartmentId);
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.RequiredDate);

        builder.HasMany(x => x.Items)
            .WithOne(x => x.PurchaseRequest)
            .HasForeignKey(x => x.PurchaseRequestId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
