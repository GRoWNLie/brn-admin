-- CreateTable
CREATE TABLE "upsell_rules" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_value" TEXT,
    "target_product_ids" JSONB NOT NULL,
    "placement" TEXT NOT NULL DEFAULT 'cart',
    "rule_type" TEXT NOT NULL DEFAULT 'cross_sell',
    "discount_percent" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "show_count" INTEGER NOT NULL DEFAULT 0,
    "click_count" INTEGER NOT NULL DEFAULT 0,
    "purchase_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upsell_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_reviews" (
    "id" SERIAL NOT NULL,
    "shopify_product_id" TEXT NOT NULL,
    "product_title" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "ai_summary" TEXT,
    "ai_spam_score" INTEGER,
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "einvoices" (
    "id" SERIAL NOT NULL,
    "order_id" TEXT NOT NULL,
    "order_name" TEXT NOT NULL,
    "invoice_type" TEXT NOT NULL,
    "tax_id" TEXT,
    "tax_office" TEXT,
    "customer_name" TEXT NOT NULL,
    "customer_address" TEXT NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "tax_amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "invoice_number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "gib_uuid" TEXT,
    "pdf_url" TEXT,
    "xml_content" TEXT,
    "error_msg" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "einvoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installment_settings" (
    "id" SERIAL NOT NULL,
    "bank_code" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "card_family" TEXT NOT NULL,
    "enabled_installments" JSONB NOT NULL,
    "commission_rates" JSONB NOT NULL,
    "min_amount" DECIMAL(10,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installment_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "upsell_rules_active_placement_idx" ON "upsell_rules"("active", "placement");

-- CreateIndex
CREATE INDEX "product_reviews_shopify_product_id_idx" ON "product_reviews"("shopify_product_id");

-- CreateIndex
CREATE INDEX "product_reviews_status_idx" ON "product_reviews"("status");

-- CreateIndex
CREATE UNIQUE INDEX "einvoices_invoice_number_key" ON "einvoices"("invoice_number");

-- CreateIndex
CREATE INDEX "einvoices_order_id_idx" ON "einvoices"("order_id");

-- CreateIndex
CREATE INDEX "einvoices_invoice_type_status_idx" ON "einvoices"("invoice_type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "installment_settings_bank_code_key" ON "installment_settings"("bank_code");
