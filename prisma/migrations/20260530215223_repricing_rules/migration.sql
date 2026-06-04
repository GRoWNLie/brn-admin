-- CreateTable
CREATE TABLE "repricing_rules" (
    "id" SERIAL NOT NULL,
    "marketplace" TEXT NOT NULL,
    "sku" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "strategy" TEXT NOT NULL DEFAULT 'match_buybox',
    "beat_amount" DOUBLE PRECISION,
    "fixed_price" DOUBLE PRECISION,
    "min_price" DOUBLE PRECISION,
    "max_price" DOUBLE PRECISION,
    "last_run_at" TIMESTAMP(3),
    "last_action" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "repricing_rules_marketplace_idx" ON "repricing_rules"("marketplace");
