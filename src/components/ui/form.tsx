import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, id, options, placeholder, ...props }, ref) => {
    const selectId = id || props.name;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-foreground",
            "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
            "disabled:opacity-50 disabled:bg-muted-soft",
            "appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1rem] pr-9",
            "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')]",
            error && "border-danger focus:ring-danger/30 focus:border-danger",
            className
          )}
          aria-invalid={error ? true : undefined}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-xs text-danger" role="alert">
            {error}
          </p>
        )}
        {!error && hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const textareaId = id || props.name;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "w-full px-3 py-2 rounded-lg border border-border bg-white text-sm text-foreground",
            "placeholder:text-muted/70",
            "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
            "disabled:opacity-50 disabled:bg-muted-soft",
            "min-h-[80px] resize-y",
            error && "border-danger focus:ring-danger/30 focus:border-danger",
            className
          )}
          aria-invalid={error ? true : undefined}
          {...props}
        />
        {error && (
          <p className="text-xs text-danger" role="alert">
            {error}
          </p>
        )}
        {!error && hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export function Fieldset({
  className,
  ...props
}: React.FieldsetHTMLAttributes<HTMLFieldSetElement>) {
  return <fieldset className={cn("space-y-4", className)} {...props} />;
}

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}