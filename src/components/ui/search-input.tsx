"use client";

import * as React from "react";
import { Icon } from "./icon";
import { cn } from "@/lib/utils";

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className,
  debounceMs = 300,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
}) {
  const [localValue, setLocalValue] = React.useState(value);
  const [prevValue, setPrevValue] = React.useState(value);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when the controlled value changes (adjust during render pattern)
  if (prevValue !== value) {
    setPrevValue(value);
    setLocalValue(value);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setLocalValue(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(v), debounceMs);
  };

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className={cn("relative", className)}>
      <Icon
        name="search"
        size={18}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
      />
      <input
        type="search"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full h-10 pl-9 pr-9 rounded-lg border border-border bg-white text-sm placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        aria-label={placeholder}
      />
      {localValue && (
        <button
          onClick={() => {
            setLocalValue("");
            onChange("");
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted-soft"
          aria-label="Clear search"
        >
          <Icon name="x" size={14} className="text-muted" />
        </button>
      )}
    </div>
  );
}