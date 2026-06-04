-- CreateTable
CREATE TABLE "marketplace_integrations" (
    "id" SERIAL NOT NULL,
    "marketplace" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "api_key" TEXT,
    "api_secret" TEXT,
    "seller_id" TEXT,
    "extra" TEXT,
    "auto_stock" BOOLEAN NOT NULL DEFAULT true,
    "auto_price" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "status_message" TEXT,
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_listings" (
    "id" SERIAL NOT NULL,
    "marketplace" TEXT NOT NULL,
    "shopify_product_id" TEXT,
    "sku" TEXT,
    "barcode" TEXT,
    "title" TEXT,
    "marketplace_item_id" TEXT,
    "price" DOUBLE PRECISION,
    "stock" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "buybox_winner" BOOLEAN,
    "buybox_price" DOUBLE PRECISION,
    "our_price" DOUBLE PRECISION,
    "seller_count" INTEGER,
    "buybox_checked_at" TIMESTAMP(3),
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_orders" (
    "id" SERIAL NOT NULL,
    "marketplace" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "status" TEXT,
    "customer_name" TEXT,
    "total" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'TRY',
    "line_count" INTEGER,
    "raw" TEXT,
    "ordered_at" TIMESTAMP(3),
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_integrations_marketplace_key" ON "marketplace_integrations"("marketplace");

-- CreateIndex
CREATE INDEX "marketplace_listings_marketplace_idx" ON "marketplace_listings"("marketplace");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_listings_marketplace_sku_key" ON "marketplace_listings"("marketplace", "sku");

-- CreateIndex
CREATE INDEX "marketplace_orders_marketplace_idx" ON "marketplace_orders"("marketplace");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_orders_marketplace_order_number_key" ON "marketplace_orders"("marketplace", "order_number");
