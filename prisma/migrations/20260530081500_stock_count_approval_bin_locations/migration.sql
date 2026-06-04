-- AlterTable
ALTER TABLE "stock_count_items" ADD COLUMN     "location" TEXT;

-- AlterTable
ALTER TABLE "stock_counts" ADD COLUMN     "applied_to_shopify" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by" TEXT,
ADD COLUMN     "submitted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "bin_locations" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "title" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bin_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bin_locations_sku_key" ON "bin_locations"("sku");
