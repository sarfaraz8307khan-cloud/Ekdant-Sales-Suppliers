-- Vehicle Date (purchase/received date, backdatable) and Location
-- SQLite cannot ADD COLUMN with a non-constant default; add nullable,
-- backfill from createdAt, and let Prisma always supply the value at insert.
ALTER TABLE "Vehicle" ADD COLUMN "vehicleDate" DATETIME;
UPDATE "Vehicle" SET "vehicleDate" = COALESCE("createdAt", CURRENT_TIMESTAMP) WHERE "vehicleDate" IS NULL;
ALTER TABLE "Vehicle" ADD COLUMN "location" TEXT;
