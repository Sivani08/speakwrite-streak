import { cn } from "@/lib/utils";

export function ScoreBadge({
  label,
  value,
  suffix = "%",
  className,
}: {
  label: string;
  value: number | null | undefined;
  suffix?: string;
  className?: string;
}) {
  const score = value ?? 0;
  const tone =
    score >= 85
      ? "bg-success/12 text-success"
      : score >= 70
        ? "bg-warning/15 text-warning-foreground"
        : "bg-destructive/12 text-destructive";

  return (
    <div className={cn("rounded-xl border p-4", className)}>
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
      <p className={cn("mt-1 inline-flex rounded-lg px-2 py-0.5 font-display text-2xl font-bold", tone)}>
        {score}
        {suffix}
      </p>
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "shadow-card rounded-2xl border p-5",
        accent ? "gradient-streak text-streak-foreground border-transparent" : "bg-card",
      )}
    >
      <p className={cn("text-xs font-semibold tracking-wide uppercase", !accent && "text-muted-foreground")}>
        {label}
      </p>
      <p className="font-display mt-2 text-3xl font-bold">{value}</p>
      {hint && <p className={cn("mt-1 text-xs", !accent && "text-muted-foreground")}>{hint}</p>}
    </div>
  );
}
