"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, ClipboardList, Leaf, LogOut, Mail, Pencil, Phone, Save, ScanLine, ShieldCheck, Sprout, UserRound, X } from "lucide-react";
import styles from "./profile.module.css";
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
    if (saving) return;
    if (!draftFullName.trim()) { toast.error("กรุณาระบุชื่อ-นามสกุล"); return; }
    setSaving(true);
    try {
      await updateProfile({ fullName: draftFullName.trim(), phoneNumber: draftPhoneNumber.trim() });
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
    <div className={styles.page}>
      <div className={styles.backdrop} aria-hidden><Leaf /><Leaf /></div>
      <div className={styles.intro}>
        <span className={styles.introIcon}><UserRound aria-hidden /></span>
        <div><span className={styles.eyebrow}>บัญชีผู้ใช้</span>
        <h1>โปรไฟล์ของคุณ</h1>
        <p>จัดการข้อมูลส่วนตัว เพื่อการดูแลสวนปาล์มที่สะดวกยิ่งขึ้น</p></div>
      </div>

      {/* Profile banner */}
      <div className={styles.banner}>
        <div className={styles.bannerPhoto} aria-hidden />
        <Avatar size="lg" className={styles.avatar}>
          <AvatarFallback className={styles.avatarFallback}>{initials}</AvatarFallback>
        </Avatar>
        <div className={styles.identity}>
          <div className="flex flex-wrap items-center gap-2">
            <h2>{currentUser.fullName}</h2>
            <Badge className={styles.roleBadge}>{currentUser.role === "admin" ? <ShieldCheck /> : <Sprout />}{currentUser.role === "admin" ? "ผู้ดูแลระบบ" : "เกษตรกร"}</Badge>
          </div>
          <p className={styles.identityEmail}>{currentUser.email}</p>
          <p className={styles.joined}>
            สมัครสมาชิกเมื่อ {formatThaiDateTime(currentUser.createdAt)}
          </p>
        </div>
        {diagnosisCount !== null && (
          <div className={styles.count}>
            <ScanLine className="size-5" aria-hidden />
            <div>
              <p className="text-lg font-bold leading-none">{diagnosisCount}</p>
              <p className="text-xs">รายการตรวจวิเคราะห์</p>
            </div>
          </div>
        )}
      </div>

      <div className={styles.columns}>
        <Card className={styles.detailsCard}>
          <CardHeader className={styles.cardHeader}>
            <CardTitle className={styles.cardTitle}><span><UserRound aria-hidden /></span><div>ข้อมูลส่วนตัว<p>ตรวจสอบและอัปเดตข้อมูลบัญชีของคุณ</p></div></CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName"><UserRound className="size-4" aria-hidden />ชื่อ-นามสกุล</Label>
              <Input
                id="fullName"
                className={styles.input}
                value={editing ? draftFullName : currentUser.fullName}
                disabled={!editing || saving}
                autoComplete="name"
                maxLength={100}
                onChange={(e) => setDraftFullName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email"><Mail className="size-4" aria-hidden />อีเมล</Label>
              <Input id="email" className={styles.input} value={currentUser.email} disabled />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phoneNumber"><Phone className="size-4" aria-hidden />เบอร์โทร</Label>
              <Input
                id="phoneNumber"
                className={styles.input}
                value={editing ? draftPhoneNumber : currentUser.phoneNumber ?? ""}
                disabled={!editing || saving}
                type="tel"
                autoComplete="tel"
                maxLength={20}
                onChange={(e) => setDraftPhoneNumber(e.target.value)}
                placeholder="ไม่ระบุ"
              />
            </div>

            {editing ? (
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" size="lg" className="h-11" onClick={handleCancel} disabled={saving}>
                  <X /> ยกเลิก
                </Button>
                <Button size="lg" className={styles.saveButton} onClick={handleSave} disabled={saving || !draftFullName.trim()}>
                  <Save /> {saving ? "กำลังบันทึก..." : "บันทึก"}
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="lg" className={styles.editButton} onClick={handleStartEditing}>
                <Pencil /> แก้ไขข้อมูล
              </Button>
            )}
          </CardContent>
        </Card>

        <div className={styles.sidebar}>
          <div className={styles.accountCard}>
            <h2><span><ShieldCheck aria-hidden /></span>บัญชี PalmGuard</h2>
            <p>ดูข้อมูลและผลการตรวจวิเคราะห์ของคุณได้ในที่เดียว</p>
            <Link href="/history"><ScanLine /> ประวัติการวินิจฉัย <ArrowRight /></Link>
            {currentUser.role === "admin" && <Link href="/admin"><ShieldCheck />จัดการระบบ <ArrowRight /></Link>}
          </div>
          <div className={styles.surveyCard}>
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

          <Button variant="outline" size="lg" className={styles.logoutButton} onClick={handleLogout} disabled={saving}>
            <LogOut /> ออกจากระบบ
          </Button>
          <p className={styles.motto}>ดูแลปาล์ม ให้คุณก้าวไกล <Leaf aria-hidden /></p>
        </div>
      </div>
    </div>
  );
}
