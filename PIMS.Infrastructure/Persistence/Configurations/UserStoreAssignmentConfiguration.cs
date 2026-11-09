using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PIMS.Domain.Entities;

namespace PIMS.Infrastructure.Persistence.Configurations;

public class UserStoreAssignmentConfiguration
    : IEntityTypeConfiguration<UserStoreAssignment>
{
    public void Configure(EntityTypeBuilder<UserStoreAssignment> builder)
    {
        builder.ToTable("user_store_assignments");

        builder.HasKey(x => new
        {
            x.UserId,
            x.StoreId
        });

        builder.HasOne(x => x.User)
            .WithMany(x => x.StoreAssignments)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Store)
            .WithMany()
            .HasForeignKey(x => x.StoreId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}