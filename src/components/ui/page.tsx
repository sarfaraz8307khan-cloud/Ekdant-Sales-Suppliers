"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./icon";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actionLabel,
  onAction,
  actionIcon = "plus",
  backHref,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: string;
  backHref?: string;
}) {
  const router = useRouter();
  const handleBack = () => {
    if (backHref) router.push(backHref);
  };
  return (
    <div className="flex items-start justify-between gap-3 mb-5">
      <div className="flex items-start gap-3 min-w-0">
        {backHref && (
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 p-2 -m-2 min-h-11 rounded-lg text-sm font-medium text-foreground hover:bg-muted-soft transition-colors shrink-0"
            aria-label="Go back"
          >
            <Icon name="arrow-left" size={20} />
            <span className="hidden sm:inline">Back</span>
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {actionLabel && onAction && (
        <Button className="shrink-0" onClick={onAction}>
          <Icon name={actionIcon} size={16} />
          <span className="hidden sm:inline">{actionLabel}</span>
          <span className="sm:hidden">{actionLabel.split(" ")[0]}</span>
        </Button>
      )}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-3 mt-4">
      <p className="text-xs text-muted">
        {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="h-8 w-8 rounded-lg border border-border bg-white flex items-center justify-center hover:bg-muted-soft disabled:opacity-40 disabled:pointer-events-none transition-colors"
          aria-label="Previous page"
        >
          <Icon name="chevron-left" size={16} />
        </button>
        <span className="text-sm text-muted">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="h-8 w-8 rounded-lg border border-border bg-white flex items-center justify-center hover:bg-muted-soft disabled:opacity-40 disabled:pointer-events-none transition-colors"
          aria-label="Next page"
        >
          <Icon name="chevron-right" size={16} />
        </button>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  tone = "default",
  sub,
}: {
  label: string;
  value: string | number;
  icon: string;
  tone?: "default" | "success" | "warning" | "danger" | "primary";
  sub?: string;
}) {
  const tones = {
    default: "bg-muted-soft text-muted",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    primary: "bg-primary-soft text-primary",
  };

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted">{label}</p>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", tones[tone])}>
          <Icon name={icon} size={16} />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground mt-2">{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}