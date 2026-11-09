
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PIMS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PreventOverlappingActiveItemPricing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                CREATE EXTENSION IF NOT EXISTS btree_gist;
                """);

            migrationBuilder.Sql(
                """
                ALTER TABLE item_pricing
                ADD CONSTRAINT "EX_item_pricing_no_active_overlap"
                EXCLUDE USING gist
                (
                    "ItemId" WITH =,
                    "CurrencyCode" WITH =,
                    tstzrange("EffectiveFrom", "EffectiveTo", '[]') WITH &&
                )
                WHERE ("IsActive" = TRUE);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE item_pricing
                DROP CONSTRAINT IF EXISTS "EX_item_pricing_no_active_overlap";
                """);
        }
    }
}
