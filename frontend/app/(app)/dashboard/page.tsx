"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ScanLine,
  ArrowRight,
  Leaf,
  Loader2,
  UploadCloud,
  Sprout,
  Droplets,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DiagnosisListItem } from "@/components/diagnosis/diagnosis-list-item";
import { Sparkline } from "@/components/dashboard/sparkline";
import { createDiagnosis, listDiagnoses } from "@/lib/diagnoses";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api-client";
import { diseaseVisual, formatConfidence, formatThaiDateTime } from "@/lib/disease-ui";
import { cn } from "@/lib/utils";
import type { Diagnosis, DiseaseCode } from "@/lib/types";

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

const careTips = [
  {
    icon: Leaf,
    title: "หมั่นตรวจใบปาล์มสม่ำเสมอ",
    desc: "สังเกตอาการผิดปกติบนใบเป็นประจำ เพื่อป้องกันการระบาดลุกลาม",
  },
  {
    icon: Sprout,
    title: "เว้นระยะปลูกให้อากาศถ่ายเท",
    desc: "ช่วยลดความชื้นสะสมที่เป็นสาเหตุของโรคใบจุด",
  },
  {
    icon: Droplets,
    title: "ตรวจใต้ใบหาเพลี้ยหอย",
    desc: "หากพบคราบขาวคล้ายเกล็ด ให้ฉีดพ่นน้ำแรงดันหรือใช้สารกำจัดแมลงที่เหมาะสม",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[] | null>(null);
  const [total, setTotal] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listDiagnoses({ pageSize: 100 })
      .then((res) => {
        if (cancelled) return;
        setDiagnoses(res.items);
        setTotal(res.total);
      })
      .catch(() => {
        if (!cancelled) setDiagnoses([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleFile(file: File | undefined) {
    if (!file) return;
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
  const recent = diagnoses.slice(0, 6);

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
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <span className="text-xs font-bold tracking-wide text-primary">ภาพรวม</span>
        <h1 className="text-2xl font-bold">สวัสดี, {user.fullName} 👋</h1>
        <p className="text-muted-foreground">ภาพรวมการวินิจฉัยใบปาล์มน้ำมันของคุณ</p>
      </div>

      {/* CTA banner */}
      <div className="relative overflow-hidden rounded-3xl bg-primary text-primary-foreground">
        <div className="absolute inset-y-0 right-0 hidden w-2/5 lg:block">
          <Image src="/auth-hero-2.png" alt="" fill sizes="40vw" className="object-cover" />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "linear-gradient(90deg, var(--primary) 0%, transparent 55%)" }}
          />
        </div>

        <div className="relative z-10 flex flex-col gap-4 p-6 md:p-8 lg:max-w-xl">
          <div>
            <h2 className="text-lg font-bold md:text-xl">พร้อมตรวจสอบใบปาล์มวันนี้หรือยัง?</h2>
            <p className="text-sm text-primary-foreground/80">
              ถ่ายภาพหรืออัปโหลดภาพใบปาล์ม เพื่อรับผลวิเคราะห์เบื้องต้นทันที
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div
              role="button"
              tabIndex={0}
              onClick={() => !uploading && fileInputRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFile(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                "flex flex-1 cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-3 text-left transition-colors",
                isDragging
                  ? "border-primary-foreground bg-primary-foreground/20"
                  : "border-primary-foreground/30 bg-primary-foreground/10 hover:bg-primary-foreground/15"
              )}
            >
              {uploading ? (
                <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden />
              ) : (
                <UploadCloud className="size-5 shrink-0" aria-hidden />
              )}
              <div className="text-sm">
                <p className="font-semibold leading-none">
                  {uploading ? "กำลังวิเคราะห์..." : "ลากและวางไฟล์ที่นี่"}
                </p>
                <p className="mt-1 text-xs text-primary-foreground/70">
                  {uploading ? "โปรดรอสักครู่" : "หรือคลิกเพื่อเลือกไฟล์ JPG, PNG (ไม่เกิน 10MB)"}
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>

            <Button asChild size="lg" variant="secondary" className="h-11 shrink-0 pl-5 pr-1.5">
              <Link href="/diagnose">
                วินิจฉัยใหม่
                <span className="ml-2 flex size-7 items-center justify-center rounded-full bg-foreground/10">
                  <ScanLine className="size-3.5" aria-hidden />
                </span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ key, label, count, icon: Icon, badgeClass, lineClass, sparkline }) => (
          <Card key={key}>
            <CardHeader>
              <span className={cn("flex size-9 items-center justify-center rounded-full", badgeClass)}>
                <Icon className="size-4" aria-hidden />
              </span>
              <CardTitle className="mt-2 text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between gap-2">
              <span className="text-3xl font-bold">{count}</span>
              <Sparkline values={sparkline} className={cn("h-7 w-16", lineClass)} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent list */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Leaf className="size-4 text-primary" aria-hidden />
              รายการล่าสุด
            </CardTitle>
            <Link href="/history" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              ดูทั้งหมด <ArrowRight className="size-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">ยังไม่มีรายการวินิจฉัย</p>
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
                      {recent.map((d) => {
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
                  {recent.map((d) => (
                    <DiagnosisListItem key={d.id} diagnosis={d} />
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sidebar column: tips + survey CTA */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">เคล็ดลับดูแลใบปาล์ม</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {careTips.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold leading-snug">{title}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="relative overflow-hidden rounded-2xl">
            <Image
              src="/auth-hero-1.png"
              alt=""
              width={400}
              height={260}
              className="h-40 w-full object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, color-mix(in oklch, black 10%, transparent) 0%, color-mix(in oklch, black 75%, transparent) 100%)",
              }}
            />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4 text-primary-foreground">
              <p className="font-bold">ช่วยเราพัฒนาระบบ</p>
              <p className="text-xs text-primary-foreground/80">
                แบบสอบถามความพึงพอใจ ใช้เวลาไม่ถึง 1 นาที
              </p>
              <Button asChild size="sm" variant="secondary" className="mt-1 w-fit pl-3 pr-1">
                <Link href="/survey">
                  ทำแบบสอบถาม
                  <span className="ml-1.5 flex size-5 items-center justify-center rounded-full bg-foreground/10">
                    <ClipboardList className="size-3" aria-hidden />
                  </span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
