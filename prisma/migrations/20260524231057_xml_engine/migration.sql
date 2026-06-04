/*
  Warnings:

  - You are about to drop the `Feed` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Filter` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Mapping` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Product` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Rule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Setting` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Filter" DROP CONSTRAINT "Filter_feedId_fkey";

-- DropForeignKey
ALTER TABLE "Mapping" DROP CONSTRAINT "Mapping_feedId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_feedId_fkey";

-- DropForeignKey
ALTER TABLE "Rule" DROP CONSTRAINT "Rule_feedId_fkey";

-- DropTable
DROP TABLE "Feed";

-- DropTable
DROP TABLE "Filter";

-- DropTable
DROP TABLE "Mapping";

-- DropTable
DROP TABLE "Product";

-- DropTable
DROP TABLE "Rule";

-- DropTable
DROP TABLE "Setting";

-- CreateTable
CREATE TABLE "feeds" (
    "id" SERIAL NOT NULL,
    "shop" TEXT NOT NULL DEFAULT 'xyc2un-pk.myshopify.com',
    "title" TEXT,
    "url" TEXT,
    "product_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Aktif',
    "sync_status" TEXT NOT NULL DEFAULT 'Güncel',
    "last_sync" TEXT,
    "next_sync" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feeds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rules" (
    "id" SERIAL NOT NULL,
    "feed_id" INTEGER NOT NULL,
    "rule_type" TEXT,
    "target_field" TEXT,
    "calc_method" TEXT,
    "math_steps" JSONB,
    "rounding_type" TEXT,
    "rounding_decimals" INTEGER NOT NULL DEFAULT 2,
    "fixed_decimal_value" INTEGER NOT NULL DEFAULT 99,

    CONSTRAINT "rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "filters" (
    "id" SERIAL NOT NULL,
    "feed_id" INTEGER NOT NULL,
    "filter_type" TEXT,
    "field_name" TEXT,
    "operator" TEXT,
    "filter_value" TEXT,

    CONSTRAINT "filters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" SERIAL NOT NULL,
    "feed_id" INTEGER NOT NULL,
    "publish_channel" TEXT,
    "target_collection" TEXT,
    "allow_update" BOOLEAN NOT NULL DEFAULT true,
    "allow_new" BOOLEAN NOT NULL DEFAULT true,
    "critical_stock_enabled" BOOLEAN NOT NULL DEFAULT true,
    "critical_stock_threshold" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mappings" (
    "id" SERIAL NOT NULL,
    "feed_id" INTEGER NOT NULL,
    "mapping_data" JSONB,

    CONSTRAINT "mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "feed_id" INTEGER NOT NULL,
    "product_id" TEXT,
    "title" TEXT,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "compare_at_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT,
    "brand" TEXT,
    "images" JSONB,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "shopify_product_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "rules" ADD CONSTRAINT "rules_feed_id_fkey" FOREIGN KEY ("feed_id") REFERENCES "feeds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "filters" ADD CONSTRAINT "filters_feed_id_fkey" FOREIGN KEY ("feed_id") REFERENCES "feeds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_feed_id_fkey" FOREIGN KEY ("feed_id") REFERENCES "feeds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mappings" ADD CONSTRAINT "mappings_feed_id_fkey" FOREIGN KEY ("feed_id") REFERENCES "feeds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_feed_id_fkey" FOREIGN KEY ("feed_id") REFERENCES "feeds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
