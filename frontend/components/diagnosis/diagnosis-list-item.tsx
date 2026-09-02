import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Diagnosis } from "@/lib/types";
import { diseaseVisual, formatConfidence, formatThaiDateTime } from "@/lib/disease-ui";

export function DiagnosisListItem({ diagnosis }: { diagnosis: Diagnosis }) {
  const visual = diagnosis.result ? diseaseVisual[diagnosis.result.classCode] : null;
  const Icon = visual?.icon;
  const title =
    diagnosis.result?.nameTh ?? (diagnosis.status === "failed" ? "วิเคราะห์ไม่สำเร็จ" : "กำลังวิเคราะห์");

  return (
    <Link
      href={`/diagnose/${diagnosis.id}/result`}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/60"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={diagnosis.imageUrl}
        alt={title}
        className="size-14 shrink-0 rounded-lg border border-border object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-medium">{title}</span>
          {visual && Icon && (
            <Badge variant="outline" className={visual.badgeClass}>
              <Icon data-icon="inline-start" />
              {formatConfidence(diagnosis.result?.confidenceScore ?? null)}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{formatThaiDateTime(diagnosis.createdAt)}</p>
      </div>
    </Link>
  );
}
