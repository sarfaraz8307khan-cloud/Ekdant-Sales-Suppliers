"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";

export function Drawer({
  open,
  onClose,
  title,
  children,
  side = "right",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  side?: "left" | "right";
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

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className="absolute inset-0 bg-black/40 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          "absolute top-0 bottom-0 w-[85%] max-w-sm bg-white shadow-lg flex flex-col animate-fade-in",
          side === "right" ? "right-0" : "left-0"
        )}
      >
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-base font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 -m-2 rounded-lg hover:bg-muted-soft transition-colors"
              aria-label="Close drawer"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-black/40 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-h-[85vh] bg-white rounded-t-2xl shadow-lg animate-scale-in flex flex-col pb-safe">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" aria-hidden="true" />
        </div>
        {title && (
          <div className="flex items-center justify-between px-4 py-2">
            <h2 className="text-base font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 -m-2 rounded-lg hover:bg-muted-soft transition-colors"
              aria-label="Close"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
      </div>
    </div>
  );
}