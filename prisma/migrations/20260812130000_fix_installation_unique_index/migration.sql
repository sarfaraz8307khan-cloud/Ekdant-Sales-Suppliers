-- Positions are shared across vehicles of the same type, so the "one current
-- installation per position" rule is really per vehicle: (vehicleId, positionId).
-- Drop the previous global index and replace it with the per-vehicle one.
DROP INDEX "Installation_one_current_per_position";

CREATE UNIQUE INDEX "Installation_one_current_per_vehicle_position" ON "Installation"("vehicleId", "positionId") WHERE "isCurrent" = 1;
