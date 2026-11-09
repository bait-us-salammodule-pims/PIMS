using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PIMS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddQuotationManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "quotation_requests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    QuotationNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PurchaseRequestId = table.Column<int>(type: "integer", nullable: false),
                    ClosingDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_quotation_requests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_quotation_requests_purchase_requests_PurchaseRequestId",
                        column: x => x.PurchaseRequestId,
                        principalTable: "purchase_requests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "vendor_quotations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    QuotationRequestId = table.Column<int>(type: "integer", nullable: false),
                    VendorId = table.Column<int>(type: "integer", nullable: false),
                    VendorQuotationNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SubmittedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ValidUntil = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    IsSelected = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vendor_quotations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_vendor_quotations_quotation_requests_QuotationRequestId",
                        column: x => x.QuotationRequestId,
                        principalTable: "quotation_requests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_vendor_quotations_vendors_VendorId",
                        column: x => x.VendorId,
                        principalTable: "vendors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "vendor_quotation_items",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    VendorQuotationId = table.Column<int>(type: "integer", nullable: false),
                    PurchaseRequestItemId = table.Column<int>(type: "integer", nullable: false),
                    Quantity = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TaxPercentage = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    Remarks = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vendor_quotation_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_vendor_quotation_items_purchase_request_items_PurchaseReque~",
                        column: x => x.PurchaseRequestItemId,
                        principalTable: "purchase_request_items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_vendor_quotation_items_vendor_quotations_VendorQuotationId",
                        column: x => x.VendorQuotationId,
                        principalTable: "vendor_quotations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_quotation_requests_PurchaseRequestId",
                table: "quotation_requests",
                column: "PurchaseRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_quotation_requests_QuotationNumber",
                table: "quotation_requests",
                column: "QuotationNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_quotation_requests_Status",
                table: "quotation_requests",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_vendor_quotation_items_PurchaseRequestItemId",
                table: "vendor_quotation_items",
                column: "PurchaseRequestItemId");

            migrationBuilder.CreateIndex(
                name: "IX_vendor_quotation_items_VendorQuotationId_PurchaseRequestIte~",
                table: "vendor_quotation_items",
                columns: new[] { "VendorQuotationId", "PurchaseRequestItemId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_vendor_quotations_QuotationRequestId_IsSelected",
                table: "vendor_quotations",
                columns: new[] { "QuotationRequestId", "IsSelected" },
                unique: true,
                filter: "\"IsSelected\" = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_vendor_quotations_QuotationRequestId_VendorId",
                table: "vendor_quotations",
                columns: new[] { "QuotationRequestId", "VendorId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_vendor_quotations_VendorId",
                table: "vendor_quotations",
                column: "VendorId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "vendor_quotation_items");

            migrationBuilder.DropTable(
                name: "vendor_quotations");

            migrationBuilder.DropTable(
                name: "quotation_requests");
        }
    }
}
