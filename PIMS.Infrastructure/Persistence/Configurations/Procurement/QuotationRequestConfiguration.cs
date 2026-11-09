
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PIMS.Domain.Entities.Procurement;

namespace PIMS.Infrastructure.Persistence.Configurations.Procurement;

public sealed class QuotationRequestConfiguration
    : IEntityTypeConfiguration<QuotationRequest>
{
    public void Configure(EntityTypeBuilder<QuotationRequest> builder)
    {
        builder.ToTable("quotation_requests");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.QuotationNumber)
            .HasMaxLength(50)
            .IsRequired();

        builder.HasIndex(x => x.QuotationNumber)
            .IsUnique();

        builder.Property(x => x.ClosingDate)
            .IsRequired();

        builder.Property(x => x.Notes)
            .HasMaxLength(2000);

        builder.Property(x => x.Status)
            .IsRequired()
            .HasConversion<int>();

        builder.HasOne(x => x.PurchaseRequest)
            .WithMany()
            .HasForeignKey(x => x.PurchaseRequestId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.PurchaseRequestId);

        builder.HasIndex(x => x.Status);
    }
}
