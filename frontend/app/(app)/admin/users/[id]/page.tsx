"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DiagnosisListItem } from "@/components/diagnosis/diagnosis-list-item";
import { useAuth } from "@/lib/auth-context";
import { getUser, listUserDiagnoses } from "@/lib/admin";
import { ApiError } from "@/lib/api-client";
import { diseaseVisual, formatConfidence, formatThaiDateTime } from "@/lib/disease-ui";
import type { AppUser, Diagnosis } from "@/lib/types";

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [targetUser, setTargetUser] = useState<AppUser | null>(null);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser.role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    let cancelled = false;
    Promise.all([getUser(id), listUserDiagnoses(id, { pageSize: 100 })])
      .then(([u, res]) => {
        if (cancelled) return;
        setTargetUser(u);
        setDiagnoses(res.items);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "ไม่พบผู้ใช้งานนี้");
      });
    return () => {
      cancelled = true;
    };
  }, [id, currentUser, router]);

  if (currentUser.role !== "admin") {
    return null;
  }

  if (error) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-10 text-center">
        <p className="text-lg font-medium">{error}</p>
        <Button asChild size="lg" className="h-11">
          <Link href="/admin">
            <ArrowLeft /> กลับรายชื่อผู้ใช้
          </Link>
        </Button>
      </div>
    );
  }

  if (!targetUser || diagnoses === null) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" aria-hidden />
      </div>
    );
  }

  const initials = targetUser.fullName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  const healthyCount = diagnoses.filter((d) => d.result?.classCode === "HEALTHY").length;
  const attentionCount = diagnoses.filter(
    (d) => d.result && d.result.classCode !== "HEALTHY" && d.result.classCode !== "NON_PALM"
  ).length;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <Link
          href="/admin"
          className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> กลับรายชื่อผู้ใช้
        </Link>
        <span className="block text-xs font-bold tracking-wide text-primary">ผู้ดูแลระบบ</span>
        <h1 className="text-2xl font-bold">ข้อมูลผู้ใช้</h1>
      </div>

      {/* User banner */}
      <div className="flex flex-col items-start gap-4 rounded-3xl bg-primary p-6 text-primary-foreground sm:flex-row sm:items-center md:p-8">
        <Avatar size="lg" className="size-16 border-2 border-primary-foreground/30 bg-primary-foreground/15 text-lg">
          <AvatarFallback className="bg-transparent text-primary-foreground">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold md:text-xl">{targetUser.fullName}</h2>
            <Badge variant="secondary">
              {targetUser.role === "admin" ? (
                <>
                  <ShieldCheck data-icon="inline-start" /> ผู้ดูแลระบบ
                </>
              ) : (
                "เกษตรกร"
              )}
            </Badge>
          </div>
          <p className="text-sm text-primary-foreground/80">{targetUser.email}</p>
          {targetUser.phoneNumber && (
            <p className="text-sm text-primary-foreground/80">{targetUser.phoneNumber}</p>
          )}
          <p className="mt-1 text-xs text-primary-foreground/70">
            สมัครสมาชิกเมื่อ {formatThaiDateTime(targetUser.createdAt)}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">วินิจฉัยทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{diagnoses.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">ปกติ</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-success">{healthyCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">ควรเฝ้าระวัง</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-warning-foreground">{attentionCount}</CardContent>
        </Card>
      </div>

      {/* Diagnosis history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ประวัติการวินิจฉัยทั้งหมด</CardTitle>
        </CardHeader>
        <CardContent>
          {diagnoses.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">ผู้ใช้รายนี้ยังไม่เคยวินิจฉัย</p>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">วันที่วินิจฉัย</th>
                      <th className="py-2 pr-4 font-medium">ภาพ</th>
                      <th className="py-2 pr-4 font-medium">ผลการวินิจฉัย</th>
                      <th className="py-2 pr-0 font-medium">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diagnoses.map((d) => {
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
                          <td className="py-3 pr-0">
                            {visual && Icon ? (
                              <Badge variant="outline" className={visual.badgeClass}>
                                <Icon data-icon="inline-start" />
                                {formatConfidence(d.result?.confidenceScore ?? null)}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 md:hidden">
                {diagnoses.map((d) => (
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
