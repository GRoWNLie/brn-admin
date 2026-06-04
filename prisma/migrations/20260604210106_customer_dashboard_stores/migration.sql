-- CreateTable
CREATE TABLE "stores" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shopify_domain" TEXT NOT NULL,
    "custom_domain" TEXT,
    "config" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_themes" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "logo_url" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '#111111',
    "secondary_color" TEXT NOT NULL DEFAULT '#2563EB',
    "bg_color" TEXT NOT NULL DEFAULT '#FFFFFF',
    "text_color" TEXT NOT NULL DEFAULT '#111111',
    "font_family" TEXT NOT NULL DEFAULT 'Inter',
    "border_radius" INTEGER NOT NULL DEFAULT 8,
    "custom_css" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_content" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "top_banner_text" TEXT,
    "welcome_template" TEXT NOT NULL DEFAULT 'Welcome, {name}!',
    "kvkk_text" TEXT,
    "terms_text" TEXT,
    "visible_tabs" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_pages" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "page_key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "title" TEXT,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_activity" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "customer_id" TEXT,
    "session_token" TEXT,
    "type" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "meta" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stores_slug_key" ON "stores"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "stores_shopify_domain_key" ON "stores"("shopify_domain");

-- CreateIndex
CREATE UNIQUE INDEX "store_themes_store_id_key" ON "store_themes"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_content_store_id_key" ON "store_content"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_pages_store_id_page_key_key" ON "store_pages"("store_id", "page_key");

-- CreateIndex
CREATE INDEX "customer_activity_store_id_customer_id_idx" ON "customer_activity"("store_id", "customer_id");

-- CreateIndex
CREATE INDEX "customer_activity_store_id_type_idx" ON "customer_activity"("store_id", "type");

-- AddForeignKey
ALTER TABLE "store_themes" ADD CONSTRAINT "store_themes_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_content" ADD CONSTRAINT "store_content_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_pages" ADD CONSTRAINT "store_pages_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_activity" ADD CONSTRAINT "customer_activity_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
