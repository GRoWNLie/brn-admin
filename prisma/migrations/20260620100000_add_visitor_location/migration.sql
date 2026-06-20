-- AlterTable: Add ip/city/country to visitor_sessions
ALTER TABLE "visitor_sessions" ADD COLUMN "ip" VARCHAR(45);
ALTER TABLE "visitor_sessions" ADD COLUMN "city" VARCHAR(100);
ALTER TABLE "visitor_sessions" ADD COLUMN "country" VARCHAR(2);
