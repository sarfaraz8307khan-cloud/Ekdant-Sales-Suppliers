-- Enforce the business rule "a position can only have one current installation
-- at a time" at the database level. Historical (non-current) installations are
-- unaffected because the index is partial on isCurrent = 1.
CREATE UNIQUE INDEX "Installation_one_current_per_position" ON "Installation"("positionId") WHERE "isCurrent" = 1;
