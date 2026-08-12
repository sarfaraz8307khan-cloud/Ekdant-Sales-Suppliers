"use client";

import * as React from "react";
import { PageHeader } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { replaceTyre } from "./actions";

type VehicleOption = {
  id: string;
  registrationNo: string;
  vehicleTypeName: string;
  tyreCount: number;
  positions: {
    id: string;
    displayName: string;
    shortCode: string;
    positionType: string;
  }[];
  current: {
    positionId: string;
    tyreInternalId: string;
    tyreModel: string;
    tyreSize: string;
    installedAt: string;
  }[];
};

type AvailableModel = {
  modelId: string;
  brand: string;
  name: string;
  size: string;
  tyres: { id: string }[];
};

type Reason = { id: string; name: string };

const STEPS = [
  { label: "Vehicle", icon: "truck" },
  { label: "Location", icon: "map-pin" },
  { label: "Tyre", icon: "circle-dot" },
  { label: "Reason", icon: "message-square" },
  { label: "Confirm", icon: "check-circle" },
] as const;

const REASON_OPTIONS = ["Worn Out", "Damaged", "Puncture", "Accident", "Other"];

export function ReplaceTyreClient({
  vehicles,
  availableByModel,
  reasons,
}: {
  vehicles: VehicleOption[];
  availableByModel: AvailableModel[];
  reasons: Reason[];
}) {
  const { toast } = useToast();
  const [step, setStep] = React.useState(0);
  const [vehicleId, setVehicleId] = React.useState("");
  const [positionId, setPositionId] = React.useState("");
  const [selectedModelId, setSelectedModelId] = React.useState("");
  const [selectedTyreId, setSelectedTyreId] = React.useState("");
  const [reasonText, setReasonText] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [odometer, setOdometer] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const activeVehicle = vehicles.find((v) => v.id === vehicleId);
  const currentAtPosition = activeVehicle?.current.find((c) => c.positionId === positionId);
  const selectedModel = availableByModel.find((m) => m.modelId === selectedModelId);
  const selectedReason = reasons.find((r) => r.name === reasonText);
  const selectedPosition = activeVehicle?.positions.find((p) => p.id === positionId);

  const canProceed = (() => {
    switch (step) {
      case 0:
        return !!vehicleId;
      case 1:
        return !!positionId && !!currentAtPosition;
      case 2:
        return !!selectedTyreId;
      case 3:
        return !!reasonText && !!date && odometer !== "" && !isNaN(Number(odometer));
      default:
        return true;
    }
  })();

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const reset = () => {
    setStep(0);
    setVehicleId("");
    setPositionId("");
    setSelectedModelId("");
    setSelectedTyreId("");
    setReasonText("");
    setNotes("");
    setDate(new Date().toISOString().slice(0, 10));
    setOdometer("");
    setError(null);
    setSuccess(false);
  };

  const handleConfirm = async () => {
    setPending(true);
    setError(null);
    const result = await replaceTyre({
      vehicleId,
      positionId,
      tyreId: selectedTyreId,
      removedReasonId: selectedReason?.id || undefined,
      removedAt: date,
      odometer: Number(odometer),
      notes: notes.trim() || undefined,
    });
    setPending(false);

    if (result.ok) {
      setSuccess(true);
      toast("success", "Tyre replaced successfully");
      setTimeout(() => {
        toast("success", "Inventory updated");
        reset();
      }, 300);
    } else {
      const fieldError = Object.values(result.errors)[0];
      setError(fieldError ?? "Unable to complete the replacement. Please try again.");
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto">
        <PageHeader title="Replace Tyre" description="Tyre replacement workflow" backHref="/" />
        <div className="bg-surface rounded-2xl border border-border shadow p-8 text-center animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-soft mx-auto">
            <Icon name="check-circle-2" size={32} className="text-success" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mt-4">Tyre replaced successfully</h2>
          <p className="text-sm text-muted mt-1">Inventory updated. No refresh needed.</p>
          <div className="mt-6">
            <Button onClick={reset}>Replace Another Tyre</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader title="Replace Tyre" description="Replace a tyre on a vehicle" backHref="/" />

      {/* Stepper */}
      <ol className="flex items-center gap-1 mb-6 px-1" aria-label="Replacement steps">
        {STEPS.map((s, i) => (
          <li key={s.label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 w-full">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                  i < step
                    ? "bg-success text-white"
                    : i === step
                    ? "bg-primary text-white"
                    : "bg-muted-soft text-muted"
                )}
              >
                {i < step ? (
                  <Icon name="check" size={16} />
                ) : (
                  <span className="text-xs font-semibold">{i + 1}</span>
                )}
              </div>
              <span className={cn("text-[10px] font-medium", i === step ? "text-primary" : "text-muted")}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("h-0.5 flex-1 mb-4", i < step ? "bg-success" : "bg-muted-soft")} />
            )}
          </li>
        ))}
      </ol>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-danger-soft border border-danger/20 px-3 py-2.5 text-sm text-danger mb-4 animate-fade-in-up" role="alert">
          <Icon name="alert-triangle" size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-surface rounded-2xl border border-border shadow-sm p-4 sm:p-6">
        {/* Step 0: Vehicle */}
        {step === 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-foreground">Select Vehicle</h2>
            <div className="space-y-2">
              {vehicles.length === 0 && (
                <p className="text-sm text-muted">No active vehicles. Add a vehicle first.</p>
              )}
              {vehicles.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setVehicleId(v.id);
                    setPositionId("");
                    setSelectedModelId("");
                    setSelectedTyreId("");
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors",
                    vehicleId === v.id
                      ? "border-primary bg-primary-soft"
                      : "border-border hover:bg-muted-soft"
                  )}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary-soft flex items-center justify-center shrink-0">
                    <Icon name="truck" size={20} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground text-sm">{v.registrationNo}</p>
                    <p className="text-xs text-muted">{v.vehicleTypeName} · {v.tyreCount} tyres</p>
                  </div>
                  <Icon
                    name={vehicleId === v.id ? "check-circle-2" : "chevron-right"}
                    size={18}
                    className={vehicleId === v.id ? "text-primary" : "text-muted"}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Location */}
        {step === 1 && activeVehicle && (
          <div className="space-y-3">
            <h2 className="font-semibold text-foreground">Select Location</h2>
            <p className="text-xs text-muted -mt-2">
              {activeVehicle.registrationNo} · {activeVehicle.vehicleTypeName}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeVehicle.positions.map((p) => {
                const current = activeVehicle.current.find((c) => c.positionId === p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPositionId(p.id);
                      setSelectedModelId("");
                      setSelectedTyreId("");
                    }}
                    disabled={!current}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-xl border p-3 text-left transition-colors",
                      !current && "opacity-50 cursor-not-allowed",
                      positionId === p.id
                        ? "border-primary bg-primary-soft"
                        : "border-border hover:bg-muted-soft"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{p.displayName}</p>
                      <p className="text-[11px] text-muted truncate">
                        {current
                          ? `${current.tyreInternalId} · ${current.tyreModel}`
                          : "Empty position"}
                      </p>
                    </div>
                    {current && (
                      <Icon
                        name={positionId === p.id ? "check-circle-2" : "chevron-right"}
                        size={18}
                        className={positionId === p.id ? "text-primary" : "text-muted"}
                      />
                    )}
                  </button>
                );
              })}
            </div>
            {activeVehicle.positions.length > 0 &&
              activeVehicle.positions.every((p) => !activeVehicle.current.find((c) => c.positionId === p.id)) && (
                <p className="text-sm text-muted bg-muted-soft rounded-lg p-3">
                  No tyres are currently installed on this vehicle. Replacement requires an existing tyre at a location.
                </p>
              )}
          </div>
        )}

        {/* Step 2: Replacement tyre */}
        {step === 2 && selectedPosition && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted-soft p-4">
              <p className="text-xs text-muted uppercase tracking-wider font-medium">Current Position</p>
              <p className="font-semibold text-foreground mt-1">{selectedPosition.displayName}</p>
              {currentAtPosition && (
                <div className="text-sm text-muted mt-1 space-y-0.5">
                  <p>
                    Current Tyre:{" "}
                    <span className="text-foreground font-medium">{currentAtPosition.tyreInternalId}</span>
                  </p>
                  <p>
                    Model:{" "}
                    <span className="text-foreground font-medium">{currentAtPosition.tyreModel}</span>
                  </p>
                </div>
              )}
            </div>

            <div>
              <h2 className="font-semibold text-foreground mb-2">Select Replacement Tyre</h2>
              {availableByModel.length === 0 && (
                <p className="text-sm text-muted">No tyres available in inventory.</p>
              )}
              <div className="space-y-2">
                {availableByModel.map((m) => {
                  const label = `${m.brand} ${m.name} ${m.size}`.trim();
                  const disabled = m.tyres.length === 0;
                  return (
                    <button
                      key={m.modelId}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setSelectedModelId(m.modelId);
                        setSelectedTyreId(m.tyres[0].id);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-colors",
                        disabled && "opacity-40 cursor-not-allowed",
                        selectedModelId === m.modelId
                          ? "border-primary bg-primary-soft"
                          : "border-border hover:bg-muted-soft"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm">{label}</p>
                        <p className={cn("text-xs font-medium mt-0.5", m.tyres.length <= 2 ? "text-warning" : "text-muted")}>
                          {m.tyres.length} available
                        </p>
                      </div>
                      <Icon
                        name={selectedModelId === m.modelId ? "check-circle-2" : "chevron-right"}
                        size={18}
                        className={selectedModelId === m.modelId ? "text-primary" : "text-muted"}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Reason + Date + Odometer */}
        {step === 3 && selectedPosition && (
          <div className="space-y-4">
            <h2 className="font-semibold text-foreground">Replacement Details</h2>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Reason</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {REASON_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReasonText(r)}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                      reasonText === r
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border text-muted hover:bg-muted-soft"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
              {reasonText && (
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={reasonText === "Other" ? "Describe the reason..." : "Optional notes"}
                  rows={2}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="replacementDate" className="block text-sm font-medium text-foreground mb-1.5">
                  Replacement Date
                </label>
                <input
                  id="replacementDate"
                  type="date"
                  required
                  value={date}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label htmlFor="odometer" className="block text-sm font-medium text-foreground mb-1.5">
                  Odometer (km)
                </label>
                <input
                  id="odometer"
                  type="number"
                  required
                  min={0}
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  placeholder="e.g. 125000"
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>
            <p className="text-xs text-muted">
              The odometer reading should be equal to or greater than the current reading on the vehicle.
            </p>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && activeVehicle && selectedPosition && selectedModel && selectedReason && (
          <div className="space-y-4">
            <h2 className="font-semibold text-foreground">Confirm Replacement</h2>
            <dl className="rounded-xl border border-border divide-y divide-border">
              <DetailRow label="Vehicle" value={`${activeVehicle.registrationNo} · ${activeVehicle.vehicleTypeName}`} />
              <DetailRow label="Location" value={selectedPosition.displayName} />
              <DetailRow
                label="Current"
                value={
                  currentAtPosition
                    ? `${currentAtPosition.tyreInternalId} · ${currentAtPosition.tyreModel}`
                    : "—"
                }
              />
              <DetailRow
                label="Replacement"
                value={`${selectedModel.brand} ${selectedModel.name} ${selectedModel.size}`.trim()}
              />
              <DetailRow label="Reason" value={reasonText} />
              <DetailRow
                label="Date"
                value={new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              />
              <DetailRow label="Odometer" value={`${Number(odometer).toLocaleString("en-IN")} km`} />
            </dl>

            {notes && (
              <p className="text-sm text-muted bg-muted-soft rounded-lg p-3">
                <span className="font-medium text-foreground">Notes: </span>
                {notes}
              </p>
            )}

            <Button size="lg" className="w-full" loading={pending} onClick={handleConfirm}>
              <Icon name="check-circle-2" size={18} />
              Confirm Replacement
            </Button>
          </div>
        )}

        {/* Stepper actions */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 0}
            className="flex-1"
          >
            <Icon name="arrow-left" size={16} />
            Back
          </Button>
          {step < STEPS.length - 1 && (
            <Button onClick={handleNext} disabled={!canProceed} className="flex-1">
              Next
              <Icon name="arrow-right" size={16} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm font-medium text-foreground text-right">{value}</dd>
    </div>
  );
}