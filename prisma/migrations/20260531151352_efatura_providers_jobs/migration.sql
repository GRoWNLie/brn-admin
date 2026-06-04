-- AlterTable
ALTER TABLE "einvoices" ADD COLUMN     "cancel_reason" TEXT,
ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "email_sent_at" TIMESTAMP(3),
ADD COLUMN     "provider_id" INTEGER;

-- CreateTable
CREATE TABLE "efatura_providers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'GIB',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "mode" TEXT NOT NULL DEFAULT 'sandbox',
    "config" TEXT,
    "invoice_types" TEXT NOT NULL DEFAULT 'EFATURA,EARSIV',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "efatura_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_logs" (
    "id" SERIAL NOT NULL,
    "invoice_id" INTEGER,
    "order_id" TEXT,
    "level" TEXT NOT NULL DEFAULT 'info',
    "action" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_jobs" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "last_error" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoice_logs_invoice_id_idx" ON "invoice_logs"("invoice_id");

-- CreateIndex
CREATE INDEX "invoice_jobs_status_scheduled_at_idx" ON "invoice_jobs"("status", "scheduled_at");
