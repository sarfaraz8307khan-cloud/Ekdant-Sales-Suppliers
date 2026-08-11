import { EmptyState } from "./states";

export function PlaceholderPage({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-5">{title}</h1>
      <div className="bg-white rounded-xl border border-border shadow-sm">
        <EmptyState
          icon={icon}
          title={`${title} module`}
          description={description}
        />
      </div>
    </div>
  );
}