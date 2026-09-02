import { Bug, CheckCircle2, ImageOff, TriangleAlert, type LucideIcon } from "lucide-react";
import type { DiseaseCode } from "@/lib/types";

// UI-only presentation mapping — not part of the DB schema (see docs/DATABASE.md).
export const diseaseVisual: Record<
  DiseaseCode,
  { icon: LucideIcon; badgeClass: string; dotClass: string }
> = {
  HEALTHY: {
    icon: CheckCircle2,
    badgeClass: "bg-success/15 text-success border-success/30",
    dotClass: "bg-success",
  },
  BROWN_SPOT: {
    icon: TriangleAlert,
    badgeClass: "bg-warning/20 text-warning-foreground border-warning/40",
    dotClass: "bg-warning",
  },
  WHITE_SCALE: {
    icon: Bug,
    badgeClass: "bg-destructive/10 text-destructive border-destructive/30",
    dotClass: "bg-destructive",
  },
  NON_PALM: {
    icon: ImageOff,
    badgeClass: "bg-muted text-muted-foreground border-border",
    dotClass: "bg-muted-foreground",
  },
};

export function formatConfidence(score: number | null): string {
  if (score === null) return "-";
  return `${Math.round(score * 100)}%`;
}

export function formatThaiDateTime(iso: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}
