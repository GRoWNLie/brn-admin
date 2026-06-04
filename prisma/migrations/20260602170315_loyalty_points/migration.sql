-- CreateTable
CREATE TABLE "loyalty_settings" (
    "id" SERIAL NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "points_per_currency" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "redeem_value" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "min_redeem" INTEGER NOT NULL DEFAULT 100,
    "signup_bonus" INTEGER NOT NULL DEFAULT 0,
    "silver_threshold" INTEGER NOT NULL DEFAULT 1000,
    "gold_threshold" INTEGER NOT NULL DEFAULT 5000,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_accounts" (
    "id" SERIAL NOT NULL,
    "shopify_customer_id" TEXT NOT NULL,
    "email" TEXT,
    "customer_name" TEXT,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "total_earned" INTEGER NOT NULL DEFAULT 0,
    "total_redeemed" INTEGER NOT NULL DEFAULT 0,
    "tier" TEXT NOT NULL DEFAULT 'BRONZE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_transactions" (
    "id" SERIAL NOT NULL,
    "account_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT,
    "order_id" TEXT,
    "order_name" TEXT,
    "code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_accounts_shopify_customer_id_key" ON "loyalty_accounts"("shopify_customer_id");

-- CreateIndex
CREATE INDEX "loyalty_accounts_balance_idx" ON "loyalty_accounts"("balance");

-- CreateIndex
CREATE INDEX "loyalty_transactions_account_id_idx" ON "loyalty_transactions"("account_id");

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "loyalty_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
