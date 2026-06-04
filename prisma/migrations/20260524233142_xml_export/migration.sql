-- CreateTable
CREATE TABLE "exports" (
    "id" SERIAL NOT NULL,
    "shop" TEXT NOT NULL DEFAULT 'xyc2un-pk.myshopify.com',
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "root_tag" TEXT NOT NULL DEFAULT 'products',
    "item_tag" TEXT NOT NULL DEFAULT 'product',
    "encoding" TEXT NOT NULL DEFAULT 'UTF-8',
    "mapping_data" JSONB,
    "filters_data" JSONB,
    "include_images" BOOLEAN NOT NULL DEFAULT true,
    "include_variants" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'Aktif',
    "product_count" INTEGER NOT NULL DEFAULT 0,
    "last_generated_at" TIMESTAMP(3),
    "cached_xml" TEXT,
    "auto_refresh_min" INTEGER NOT NULL DEFAULT 60,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exports_slug_key" ON "exports"("slug");
