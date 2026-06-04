-- CreateTable
CREATE TABLE "cart_sessions" (
    "id" TEXT NOT NULL,
    "customer_email" TEXT,
    "customer_id" TEXT,
    "items" TEXT,
    "item_count" INTEGER NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cart_sessions_customer_email_idx" ON "cart_sessions"("customer_email");

-- CreateIndex
CREATE INDEX "cart_sessions_updated_at_idx" ON "cart_sessions"("updated_at");
