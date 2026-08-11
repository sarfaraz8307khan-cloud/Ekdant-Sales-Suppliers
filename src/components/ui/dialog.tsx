"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  React.useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-black/40 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          "relative w-full bg-white rounded-t-2xl sm:rounded-2xl shadow-lg animate-scale-in",
          "max-h-[90vh] overflow-y-auto",
          sizeClasses[size]
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between p-4 sm:p-5 border-b border-border sticky top-0 bg-white z-10">
            <div>
              {title && <h2 className="text-base font-semibold">{title}</h2>}
              {description && (
                <p className="text-sm text-muted mt-0.5">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 -m-2 rounded-lg hover:bg-muted-soft transition-colors"
              aria-label="Close dialog"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
        )}
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-muted">{message}</p>
      <div className="flex gap-3 mt-5">
        <button
          onClick={onClose}
          className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted-soft transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            "flex-1 h-10 rounded-lg text-sm font-medium text-white transition-colors",
            danger ? "bg-danger hover:bg-red-700" : "bg-primary hover:bg-primary-hover",
            "disabled:opacity-50"
          )}
        >
          {loading ? "Please wait..." : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}