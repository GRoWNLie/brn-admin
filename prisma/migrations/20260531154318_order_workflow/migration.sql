-- CreateTable
CREATE TABLE "order_workflows" (
    "id" SERIAL NOT NULL,
    "order_id" TEXT NOT NULL,
    "order_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "invoiced" BOOLEAN NOT NULL DEFAULT false,
    "invoiced_at" TIMESTAMP(3),
    "prepared_at" TIMESTAMP(3),
    "shipped_at" TIMESTAMP(3),
    "carrier" TEXT,
    "tracking_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_workflows_order_id_key" ON "order_workflows"("order_id");
