-- CreateTable
CREATE TABLE "storefront_sessions" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "customer_id" TEXT,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMP(3),
    "recent_viewed" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storefront_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "storefront_sessions_store_id_customer_id_idx" ON "storefront_sessions"("store_id", "customer_id");

-- CreateIndex
CREATE INDEX "storefront_sessions_updated_at_idx" ON "storefront_sessions"("updated_at");
