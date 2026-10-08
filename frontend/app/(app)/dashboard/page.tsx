"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ScanLine, Loader2, CircleAlert } from "lucide-react";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { createDiagnosis, listDiagnoses } from "@/lib/diagnoses";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api-client";
import { diseaseVisual } from "@/lib/disease-ui";
import type { Diagnosis, DiseaseCode } from "@/lib/types";
import { ImageCropDialog, validateLeafImage } from "@/components/diagnosis/image-crop-dialog";

const SPARKLINE_DAYS = 14;

function dailyCounts(items: Diagnosis[], predicate: (d: Diagnosis) => boolean, days: number): number[] {
  const buckets = new Array(days).fill(0);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  for (const d of items) {
    if (!predicate(d)) continue;
    const created = new Date(d.createdAt);
    created.setHours(0, 0, 0, 0);
    const dayDiff = Math.round((startOfToday.getTime() - created.getTime()) / 86_400_000);
    if (dayDiff >= 0 && dayDiff < days) {
      buckets[days - 1 - dayDiff] += 1;
    }
  }
  return buckets;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [revision, setRevision] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadDiagnoses() {
      const first = await listDiagnoses({ pageSize: 100 });
      const items = [...first.items];
      for (let page = 2; (page - 1) * 100 < first.total; page++) {
        if (cancelled) return null;
        const next = await listDiagnoses({ page, pageSize: 100 });
        items.push(...next.items);
      }
      return { items, total: first.total };
    }
    loadDiagnoses()
      .then((res) => {
        if (cancelled || !res) return;
        setDiagnoses(res.items);
        setTotal(res.total);
      })
      .catch((err) => {
        if (!cancelled) { setDiagnoses([]); setLoadError(err instanceof Error ? err.message : "โหลดผลการวินิจฉัยไม่สำเร็จ กรุณาลองใหม่"); }
      });
    return () => {
      cancelled = true;
    };
  }, [revision]);

  function handleFile(file: File | undefined) {
    if (!file || uploading) return;
    const error = validateLeafImage(file);
    if (error) { toast.error(error); return; }
    setCropFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function analyzeImage(file: File) {
    setCropFile(null);
    setUploading(true);
    try {
      const diagnosis = await createDiagnosis(file);
      router.push(`/diagnose/${diagnosis.id}/result`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "วิเคราะห์ภาพไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setUploading(false);
    }
  }

  if (diagnoses === null) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" aria-hidden />
      </div>
    );
  }

  const byClass = (code: DiseaseCode) => (d: Diagnosis) => d.result?.classCode === code;
  const healthy = diagnoses.filter(byClass("HEALTHY"));
  const brownSpot = diagnoses.filter(byClass("BROWN_SPOT"));
  const whiteScale = diagnoses.filter(byClass("WHITE_SCALE"));
  const failed = diagnoses.filter(d => d.status === "failed");

  const stats = [
    {
      key: "total",
      label: "วินิจฉัยทั้งหมด",
      count: total,
      icon: ScanLine,
      badgeClass: "bg-accent text-primary",
      lineClass: "text-primary",
      sparkline: dailyCounts(diagnoses, () => true, SPARKLINE_DAYS),
    },
    {
      key: "healthy",
      label: "ปกติ",
      count: healthy.length,
      icon: diseaseVisual.HEALTHY.icon,
      badgeClass: "bg-success/15 text-success",
      lineClass: "text-success",
      sparkline: dailyCounts(diagnoses, byClass("HEALTHY"), SPARKLINE_DAYS),
    },
    {
      key: "brown-spot",
      label: "ใบจุดสีน้ำตาล",
      count: brownSpot.length,
      icon: diseaseVisual.BROWN_SPOT.icon,
      badgeClass: "bg-warning/20 text-warning-foreground",
      lineClass: "text-warning-foreground",
      sparkline: dailyCounts(diagnoses, byClass("BROWN_SPOT"), SPARKLINE_DAYS),
    },
    {
      key: "white-scale",
      label: "เพลี้ยหอย",
      count: whiteScale.length,
      icon: diseaseVisual.WHITE_SCALE.icon,
      badgeClass: "bg-destructive/10 text-destructive",
      lineClass: "text-destructive",
      sparkline: dailyCounts(diagnoses, byClass("WHITE_SCALE"), SPARKLINE_DAYS),
    },
    {
      key: "failed",
      label: "วิเคราะห์ไม่ได้",
      count: failed.length,
      icon: CircleAlert,
      badgeClass: "bg-destructive/10 text-destructive",
      lineClass: "text-destructive",
      sparkline: dailyCounts(diagnoses, d => d.status === "failed", SPARKLINE_DAYS),
    },
  ];

  return <>
    {cropFile && <ImageCropDialog file={cropFile} onCancel={() => setCropFile(null)} onConfirm={analyzeImage} confirmLabel="ครอปและส่งวิเคราะห์" />}
    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => handleFile(event.target.files?.[0])} />
    <DashboardView user={user} diagnoses={diagnoses} stats={stats} uploading={uploading} isDragging={isDragging}
      onChooseImage={() => { if (!uploading) fileInputRef.current?.click(); }} onDropImage={handleFile} onDragging={setIsDragging} error={loadError}
      onRetry={() => { setDiagnoses(null); setLoadError(""); setRevision(value => value + 1); }} />
  </>;
}
