"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { ClipboardList, LogOut, Pencil, Save, ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { logout, updateProfile } from "@/lib/auth";
import { listDiagnoses } from "@/lib/diagnoses";
import { ApiError } from "@/lib/api-client";
import { formatThaiDateTime } from "@/lib/disease-ui";

export default function ProfilePage() {
  const router = useRouter();
  const { user: currentUser, refresh } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [diagnosisCount, setDiagnosisCount] = useState<number | null>(null);
  // Draft fields only hold a value while editing — captured fresh from
  // currentUser at the moment editing starts, so they can't go stale
  // relative to the account currently logged in (see handleStartEditing).
  const [draftFullName, setDraftFullName] = useState("");
  const [draftPhoneNumber, setDraftPhoneNumber] = useState("");

  useEffect(() => {
    let cancelled = false;
    listDiagnoses({ pageSize: 1 })
      .then((res) => {
        if (!cancelled) setDiagnosisCount(res.total);
      })
      .catch(() => {
        if (!cancelled) setDiagnosisCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const initials = currentUser.fullName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  function handleStartEditing() {
    setDraftFullName(currentUser.fullName);
    setDraftPhoneNumber(currentUser.phoneNumber ?? "");
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateProfile({ fullName: draftFullName, phoneNumber: draftPhoneNumber });
      await refresh();
      setEditing(false);
      toast.success("บันทึกข้อมูลสำเร็จ");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setEditing(false);
  }

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <span className="text-xs font-bold tracking-wide text-primary">บัญชีผู้ใช้</span>
        <h1 className="text-2xl font-bold">โปรไฟล์</h1>
        <p className="text-muted-foreground">ข้อมูลบัญชีของคุณ</p>
      </div>

      {/* Profile banner */}
      <div className="flex flex-col items-start gap-4 rounded-3xl bg-primary p-6 text-primary-foreground sm:flex-row sm:items-center md:p-8">
        <Avatar size="lg" className="size-16 border-2 border-primary-foreground/30 bg-primary-foreground/15 text-lg">
          <AvatarFallback className="bg-transparent text-primary-foreground">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold md:text-xl">{currentUser.fullName}</h2>
            <Badge variant="secondary">{currentUser.role === "admin" ? "ผู้ดูแลระบบ" : "เกษตรกร"}</Badge>
          </div>
          <p className="text-sm text-primary-foreground/80">{currentUser.email}</p>
          <p className="mt-1 text-xs text-primary-foreground/70">
            สมัครสมาชิกเมื่อ {formatThaiDateTime(currentUser.createdAt)}
          </p>
        </div>
        {diagnosisCount !== null && (
          <div className="flex items-center gap-2 rounded-2xl bg-primary-foreground/10 px-4 py-3">
            <ScanLine className="size-5" aria-hidden />
            <div>
              <p className="text-lg font-bold leading-none">{diagnosisCount}</p>
              <p className="text-xs text-primary-foreground/70">ครั้งที่วินิจฉัยแล้ว</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">ข้อมูลส่วนตัว</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName">ชื่อ-นามสกุล</Label>
              <Input
                id="fullName"
                className="h-11"
                value={editing ? draftFullName : currentUser.fullName}
                disabled={!editing}
                onChange={(e) => setDraftFullName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">อีเมล</Label>
              <Input id="email" className="h-11" value={currentUser.email} disabled />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phoneNumber">เบอร์โทร</Label>
              <Input
                id="phoneNumber"
                className="h-11"
                value={editing ? draftPhoneNumber : currentUser.phoneNumber ?? ""}
                disabled={!editing}
                onChange={(e) => setDraftPhoneNumber(e.target.value)}
                placeholder="ไม่ระบุ"
              />
            </div>

            {editing ? (
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" size="lg" className="h-11" onClick={handleCancel} disabled={saving}>
                  <X /> ยกเลิก
                </Button>
                <Button size="lg" className="h-11" onClick={handleSave} disabled={saving}>
                  <Save /> {saving ? "กำลังบันทึก..." : "บันทึก"}
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="lg" className="h-11 w-full" onClick={handleStartEditing}>
                <Pencil /> แก้ไขข้อมูล
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <div className="relative overflow-hidden rounded-2xl">
            <Image src="/auth-hero-1.png" alt="" width={400} height={260} className="h-40 w-full object-cover" />
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
              <p className="text-xs text-primary-foreground/80">แบบสอบถามความพึงพอใจ ใช้เวลาไม่ถึง 1 นาที</p>
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

          <Button variant="destructive" size="lg" className="h-11 w-full" onClick={handleLogout}>
            <LogOut /> ออกจากระบบ
          </Button>
        </div>
      </div>
    </div>
  );
}
