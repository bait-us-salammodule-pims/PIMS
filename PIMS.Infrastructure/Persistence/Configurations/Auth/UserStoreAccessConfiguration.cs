using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PIMS.Domain.Entities.Auth;

namespace PIMS.Infrastructure.Persistence.Configurations.Auth;

public class UserStoreAccessConfiguration
    : IEntityTypeConfiguration<UserStoreAccess>
{
    public void Configure(
        EntityTypeBuilder<UserStoreAccess> builder)
    {
        builder.ToTable("UserStoreAccess");

        builder.HasKey(x => new
        {
            x.UserId,
            x.StoreId
        });

        builder.Property(x => x.IsActive)
            .IsRequired();

        builder.HasOne(x => x.User)
            .WithMany(x => x.StoreAccesses)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}