"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { History, Loader2, ScanLine, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDiagnosis } from "@/lib/diagnoses";
import { ApiError } from "@/lib/api-client";
import { diseaseClasses } from "@/lib/disease-catalog";
import { diseaseVisual, formatConfidence, formatThaiDateTime } from "@/lib/disease-ui";
import type { Diagnosis, DiseaseCode } from "@/lib/types";

const resultTint: Record<DiseaseCode, string> = {
  HEALTHY: "bg-success/10 text-success",
  BROWN_SPOT: "bg-warning/20 text-warning-foreground",
  WHITE_SCALE: "bg-destructive/10 text-destructive",
  NON_PALM: "bg-muted text-muted-foreground",
};

// Display order for the probability breakdown — ใบจุดสีน้ำตาล, เพลี้ยหอย, ใบปกติ.
const BREAKDOWN_ORDER: DiseaseCode[] = ["BROWN_SPOT", "WHITE_SCALE", "HEALTHY"];
const nameThByCode: Partial<Record<DiseaseCode, string>> = Object.fromEntries(
  diseaseClasses.map((d) => [d.code, d.nameTh])
);

export default function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDiagnosis(id)
      .then((d) => {
        if (!cancelled) setDiagnosis(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "ไม่พบผลการวินิจฉัยนี้");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-10 text-center">
        <p className="text-lg font-medium">{error}</p>
        <Button asChild size="lg" className="h-11">
          <Link href="/diagnose">
            <ScanLine /> วินิจฉัยใหม่
          </Link>
        </Button>
      </div>
    );
  }

  if (!diagnosis) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" aria-hidden />
      </div>
    );
  }

  if (diagnosis.status === "failed" || !diagnosis.result) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-6">
        <div>
          <span className="text-xs font-bold tracking-wide text-primary">ผลลัพธ์</span>
          <h1 className="text-2xl font-bold">ผลการวินิจฉัย</h1>
          <p className="text-muted-foreground">{formatThaiDateTime(diagnosis.createdAt)}</p>
        </div>
        <Alert variant="destructive">
          <AlertDescription>
            {diagnosis.failureReason ?? "รายการนี้วิเคราะห์ไม่สำเร็จ และไม่มีข้อมูลสาเหตุที่บันทึกไว้ กรุณาลองวินิจฉัยใหม่อีกครั้ง"}
          </AlertDescription>
        </Alert>
        <Button asChild size="lg" className="h-11">
          <Link href="/diagnose">
            <ScanLine /> วินิจฉัยใหม่
          </Link>
        </Button>
      </div>
    );
  }

  const { result } = diagnosis;
  const visual = diseaseVisual[result.classCode];
  const Icon = visual.icon;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <span className="text-xs font-bold tracking-wide text-primary">ผลลัพธ์</span>
        <h1 className="text-2xl font-bold">ผลการวินิจฉัย</h1>
        <p className="text-muted-foreground">{formatThaiDateTime(diagnosis.createdAt)}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={diagnosis.imageUrl} alt={result.nameTh} className="aspect-[4/3] w-full object-cover" />
            <div className="absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-2xl bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${resultTint[result.classCode]}`}>
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold leading-tight">{result.nameTh}</p>
                <p className="text-xs text-muted-foreground">ความเชื่อมั่น {formatConfidence(result.confidenceScore)}</p>
              </div>
              <Badge variant="outline" className={visual.badgeClass}>
                <Icon data-icon="inline-start" />
                {formatConfidence(result.confidenceScore)}
              </Badge>
            </div>
          </div>
          <CardContent className="flex flex-col gap-4 pt-4">
            {result.classProbabilities ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium">ความน่าจะเป็นในแต่ละโรค</p>
                {BREAKDOWN_ORDER.map((code) => {
                  const probability = result.classProbabilities?.[code] ?? 0;
                  const isTop = code === result.classCode;
                  return (
                    <div key={code}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className={isTop ? "font-semibold" : "text-muted-foreground"}>
                          {nameThByCode[code]}
                        </span>
                        <span className={isTop ? "font-semibold" : "text-muted-foreground"}>
                          {formatConfidence(probability)}
                        </span>
                      </div>
                      <Progress value={probability * 100} />
                    </div>
                  );
                })}
                <p className="text-sm text-muted-foreground">
                  สรุป: มีโอกาสเป็น <span className="font-semibold text-foreground">{result.nameTh}</span> มากที่สุด
                </p>
              </div>
            ) : (
              <div>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">ความเชื่อมั่น (Confidence)</span>
                  <span className="font-semibold">{formatConfidence(result.confidenceScore)}</span>
                </div>
                <Progress value={result.confidenceScore * 100} />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          {result.recommendationTh && (
            <Card>
              <CardHeader>
                <span className="flex size-9 items-center justify-center rounded-full bg-accent text-primary">
                  <ShieldAlert className="size-4" aria-hidden />
                </span>
                <CardTitle className="mt-2 text-base">คำแนะนำเบื้องต้น</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{result.recommendationTh}</CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Button asChild size="lg" variant="outline" className="h-11">
              <Link href="/history">
                <History /> ดูประวัติ
              </Link>
            </Button>
            <Button asChild size="lg" className="h-11">
              <Link href="/diagnose">
                <ScanLine /> วินิจฉัยใหม่
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
