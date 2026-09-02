"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { History as HistoryIcon, Inbox, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DiagnosisListItem } from "@/components/diagnosis/diagnosis-list-item";
import { listDiagnoses } from "@/lib/diagnoses";
import { diseaseVisual, formatConfidence, formatThaiDateTime } from "@/lib/disease-ui";
import type { Diagnosis, DiseaseCode } from "@/lib/types";

export default function HistoryPage() {
  const [filter, setFilter] = useState<DiseaseCode | "ALL">("ALL");
  const [diagnoses, setDiagnoses] = useState<Diagnosis[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listDiagnoses({ pageSize: 100 })
      .then((res) => {
        if (!cancelled) setDiagnoses(res.items);
      })
      .catch(() => {
        if (!cancelled) setDiagnoses([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filters: { value: DiseaseCode | "ALL"; label: string }[] = useMemo(() => {
    const count = (code: DiseaseCode) => (diagnoses ?? []).filter((d) => d.result?.classCode === code).length;
    return [
      { value: "ALL", label: `ทั้งหมด (${diagnoses?.length ?? 0})` },
      { value: "HEALTHY", label: `ปกติ (${count("HEALTHY")})` },
      { value: "BROWN_SPOT", label: `ใบจุด (${count("BROWN_SPOT")})` },
      { value: "WHITE_SCALE", label: `เพลี้ยหอย (${count("WHITE_SCALE")})` },
    ];
  }, [diagnoses]);

  const filtered = useMemo(() => {
    if (!diagnoses) return [];
    if (filter === "ALL") return diagnoses;
    return diagnoses.filter((d) => d.result?.classCode === filter);
  }, [diagnoses, filter]);

  if (diagnoses === null) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" aria-hidden />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <span className="text-xs font-bold tracking-wide text-primary">ประวัติ</span>
        <h1 className="text-2xl font-bold">ประวัติการวินิจฉัย</h1>
        <p className="text-muted-foreground">รายการผลวิเคราะห์ย้อนหลังทั้งหมด {diagnoses.length} รายการ</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex size-9 items-center justify-center rounded-full bg-accent text-primary">
              <HistoryIcon className="size-4" aria-hidden />
            </span>
            รายการทั้งหมด
          </CardTitle>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as DiseaseCode | "ALL")}>
            <TabsList className="w-full sm:w-fit">
              {filters.map((f) => (
                <TabsTrigger key={f.value} value={f.value}>
                  {f.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
              <Inbox className="size-8" aria-hidden />
              <p>ไม่พบรายการในหมวดนี้</p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">วันที่วินิจฉัย</th>
                      <th className="py-2 pr-4 font-medium">ภาพ</th>
                      <th className="py-2 pr-4 font-medium">ผลการวินิจฉัย</th>
                      <th className="py-2 pr-4 font-medium">สถานะ</th>
                      <th className="py-2 pr-0 text-right font-medium">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((d) => {
                      const visual = d.result ? diseaseVisual[d.result.classCode] : null;
                      const Icon = visual?.icon;
                      const title =
                        d.result?.nameTh ?? (d.status === "failed" ? "วิเคราะห์ไม่สำเร็จ" : "กำลังวิเคราะห์");
                      return (
                        <tr key={d.id} className="border-b border-border last:border-0">
                          <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">
                            {formatThaiDateTime(d.createdAt)}
                          </td>
                          <td className="py-3 pr-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={d.imageUrl}
                              alt={title}
                              className="size-12 rounded-lg border border-border object-cover"
                            />
                          </td>
                          <td className="py-3 pr-4 font-medium">{title}</td>
                          <td className="py-3 pr-4">
                            {visual && Icon ? (
                              <Badge variant="outline" className={visual.badgeClass}>
                                <Icon data-icon="inline-start" />
                                {formatConfidence(d.result?.confidenceScore ?? null)}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-3 pr-0 text-right">
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/diagnose/${d.id}/result`}>ดูรายละเอียด</Link>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 md:hidden">
                {filtered.map((d) => (
                  <DiagnosisListItem key={d.id} diagnosis={d} />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
