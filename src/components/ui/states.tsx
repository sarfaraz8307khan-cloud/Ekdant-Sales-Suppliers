import { Icon } from "./icon";
import { Button } from "./button";

export function EmptyState({
  icon = "package",
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-muted-soft flex items-center justify-center mb-4">
        <Icon name={icon} size={24} className="text-muted" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted mt-1 max-w-sm">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button className="mt-5" onClick={onAction}>
          <Icon name="plus" size={16} />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <svg
        className="animate-spin h-8 w-8 text-primary"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      <p className="text-sm text-muted mt-3">{label}</p>
    </div>
  );
}

export function ErrorState({
  message = "Something went wrong. Please try again.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-danger-soft flex items-center justify-center mb-4">
        <Icon name="alert-triangle" size={24} className="text-danger" />
      </div>
      <h3 className="text-base font-semibold text-foreground">Error</h3>
      <p className="text-sm text-muted mt-1 max-w-sm">{message}</p>
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          <Icon name="refresh-cw" size={16} />
          Try Again
        </Button>
      )}
    </div>
  );
}