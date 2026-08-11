import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "muted" | "primary";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-muted-soft text-muted",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  muted: "bg-muted-soft text-muted",
  primary: "bg-primary-soft text-primary",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    ACTIVE: "success",
    INACTIVE: "muted",
    ARCHIVED: "warning",
    AVAILABLE: "success",
    RESERVED: "info",
    INSTALLED: "primary",
    REMOVED: "warning",
    WORN_OUT: "danger",
    DAMAGED: "danger",
    SCRAPPED: "muted",
  };

  const label = status
    .toLowerCase()
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");

  return <Badge variant={map[status] ?? "default"}>{label}</Badge>;
}