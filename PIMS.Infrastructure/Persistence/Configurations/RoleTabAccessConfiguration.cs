using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PIMS.Domain.Entities;

namespace PIMS.Infrastructure.Persistence.Configurations;

public class RoleTabAccessConfiguration
    : IEntityTypeConfiguration<RoleTabAccess>
{
    public void Configure(EntityTypeBuilder<RoleTabAccess> builder)
    {
        builder.ToTable("role_tab_access");

        builder.HasKey(x => new
        {
            x.RoleId,
            x.TabId
        });

        builder.HasOne(x => x.Role)
            .WithMany(x => x.RoleTabAccesses)
            .HasForeignKey(x => x.RoleId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Tab)
            .WithMany(x => x.RoleTabAccesses)
            .HasForeignKey(x => x.TabId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}