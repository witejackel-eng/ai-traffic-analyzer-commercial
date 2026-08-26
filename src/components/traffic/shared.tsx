"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/* ---------------------------- Status helpers ----------------------------- */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    COMPLETED: "default",
    PROCESSING: "secondary",
    QUEUED: "outline",
    FAILED: "destructive",
    CANCELLED: "outline",
    READY: "secondary",
  };
  return <Badge variant={map[status] ?? "outline"} className="font-mono text-[10px] tracking-wide">{status}</Badge>;
}

/* ------------------------------ KPI card --------------------------------- */
// Template-inspired stat card: icon + label (top), big value (middle), trend hint (bottom)
export function KpiCard({
  label,
  value,
  hint,
  icon,
  accent,
  trend,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  accent?: string;
  trend?: { direction: "up" | "down" | "neutral"; value?: string };
}) {
  return (
    <div className="animate-fade-up rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between pb-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {icon && (
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10", accent ?? "text-primary")}>
            {icon}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold tracking-tight tabular-nums text-foreground">{value}</div>
      {(hint || trend) && (
        <div className="mt-1 flex items-center gap-1 text-xs">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
                trend.direction === "up" && "text-emerald-600 dark:text-emerald-400",
                trend.direction === "down" && "text-red-600 dark:text-red-400",
                trend.direction === "neutral" && "text-muted-foreground",
              )}
            >
              {trend.direction === "up" && "↑"}
              {trend.direction === "down" && "↓"}
              {trend.direction === "neutral" && "–"}
              {trend.value}
            </span>
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Severity badge ---------------------------- */
const SEVERITY_STYLES: Record<string, string> = {
  info: "bg-slate-500/12 text-slate-700 dark:text-slate-300 border-slate-500/20",
  low: "bg-emerald-600/12 text-emerald-700 dark:text-emerald-400 border-emerald-600/25",
  medium: "bg-amber-600/15 text-amber-800 dark:text-amber-400 border-amber-600/25",
  high: "bg-orange-600/15 text-orange-800 dark:text-orange-400 border-orange-600/25",
  critical: "bg-red-600/15 text-red-700 dark:text-red-400 border-red-600/25",
};

export function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.info)}>
      {severity}
    </span>
  );
}

/* --------------------------- Congestion badge ---------------------------- */
const CONGESTION_STYLES: Record<string, string> = {
  LOW: "bg-emerald-600/12 text-emerald-700 dark:text-emerald-400 border-emerald-600/25",
  MODERATE: "bg-amber-600/15 text-amber-800 dark:text-amber-400 border-amber-600/25",
  HIGH: "bg-orange-600/15 text-orange-800 dark:text-orange-400 border-orange-600/25",
  SEVERE: "bg-red-600/15 text-red-700 dark:text-red-400 border-red-600/25",
};

export function CongestionBadge({ level }: { level: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", CONGESTION_STYLES[level] ?? CONGESTION_STYLES.LOW)}>
      {level}
    </span>
  );
}

/* ------------------------------ Empty state ------------------------------ */
export function EmptyState({ title, description, icon, action }: { title: string; description?: string; icon?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 p-12 text-center">
      {icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ------------------------------ Vehicle icon ----------------------------- */
// Warm palette — each vehicle class gets a distinct, editorial color
export const VEHICLE_COLORS: Record<string, string> = {
  car: "#b45309",        // amber
  motorcycle: "#15803d", // forest green
  truck: "#7c3aed",      // plum
  bus: "#dc2626",        // terracotta red
  bicycle: "#ca8a04",    // gold
  van: "#475569",        // slate
};

export function VehicleDot({ type, size = 10 }: { type: string; size?: number }) {
  return <span className="inline-block rounded-full" style={{ width: size, height: size, background: VEHICLE_COLORS[type] ?? "#64748b" }} />;
}

/* ------------------------------ Formatters ------------------------------- */
export function fmtTime(sec: number): string {
  if (!Number.isFinite(sec)) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
