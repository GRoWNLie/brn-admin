-- AlterTable
ALTER TABLE "product_reviews" ADD COLUMN "dislike_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "product_reviews" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "product_reviews_featured_idx" ON "product_reviews"("featured");
