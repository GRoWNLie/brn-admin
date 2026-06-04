-- CreateTable
CREATE TABLE "automation_flows" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "delay_hours" INTEGER NOT NULL DEFAULT 1,
    "subject" TEXT,
    "body_template" TEXT,
    "discount_code" TEXT,
    "last_run_at" TIMESTAMP(3),
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "popups" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "headline" TEXT NOT NULL,
    "description" TEXT,
    "button_text" TEXT NOT NULL DEFAULT 'Kupon Al',
    "discount_code" TEXT,
    "image_url" TEXT,
    "trigger_type" TEXT NOT NULL DEFAULT 'delay',
    "trigger_value" INTEGER NOT NULL DEFAULT 5,
    "frequency" TEXT NOT NULL DEFAULT 'once',
    "position" TEXT NOT NULL DEFAULT 'center',
    "theme" TEXT NOT NULL DEFAULT 'light',
    "collect_email" BOOLEAN NOT NULL DEFAULT true,
    "views" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "popups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "popup_leads" (
    "id" SERIAL NOT NULL,
    "popup_id" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "popup_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "automation_flows_trigger_idx" ON "automation_flows"("trigger");

-- CreateIndex
CREATE INDEX "popup_leads_popup_id_idx" ON "popup_leads"("popup_id");

-- AddForeignKey
ALTER TABLE "popup_leads" ADD CONSTRAINT "popup_leads_popup_id_fkey" FOREIGN KEY ("popup_id") REFERENCES "popups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
