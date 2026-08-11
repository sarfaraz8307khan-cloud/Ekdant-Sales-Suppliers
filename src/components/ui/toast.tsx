"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const toastStyles: Record<ToastType, { icon: string; classes: string }> = {
  success: { icon: "check-circle-2", classes: "text-success" },
  error: { icon: "x-circle", classes: "text-danger" },
  info: { icon: "info", classes: "text-info" },
  warning: { icon: "alert-triangle", classes: "text-warning" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] space-y-2 w-[calc(100%-2rem)] max-w-sm"
        aria-live="polite"
        role="status"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-2.5 bg-white rounded-xl border border-border shadow-lg px-4 py-3 animate-fade-in-up"
            )}
          >
            <Icon
              name={toastStyles[t.type].icon}
              size={18}
              className={cn("mt-0.5 shrink-0", toastStyles[t.type].classes)}
            />
            <p className="text-sm text-foreground flex-1">{t.message}</p>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="p-1 -m-1 rounded hover:bg-muted-soft"
              aria-label="Dismiss notification"
            >
              <Icon name="x" size={14} className="text-muted" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}