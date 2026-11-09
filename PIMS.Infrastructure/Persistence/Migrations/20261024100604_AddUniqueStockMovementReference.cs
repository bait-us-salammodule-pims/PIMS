using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PIMS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueStockMovementReference : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_stock_movements_ReferenceType_ReferenceNumber",
                table: "stock_movements");

            migrationBuilder.CreateIndex(
                name: "IX_stock_movements_ReferenceType_ReferenceNumber",
                table: "stock_movements",
                columns: new[] { "ReferenceType", "ReferenceNumber" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_stock_movements_ReferenceType_ReferenceNumber",
                table: "stock_movements");

            migrationBuilder.CreateIndex(
                name: "IX_stock_movements_ReferenceType_ReferenceNumber",
                table: "stock_movements",
                columns: new[] { "ReferenceType", "ReferenceNumber" });
        }
    }
}
