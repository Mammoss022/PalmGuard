"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthHeroPanel } from "@/components/auth/auth-hero-panel";
import { register } from "@/lib/auth";
import { ApiError } from "@/lib/api-client";

const HERO_IMAGES = ["/auth-hero-1.png", "/auth-hero-2.png"];

interface FormState {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    fullName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: FormErrors = {};
    if (form.fullName.trim().length < 2) nextErrors.fullName = "กรุณากรอกชื่อ-นามสกุล";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = "รูปแบบอีเมลไม่ถูกต้อง";
    if (form.password.length < 8) nextErrors.password = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
    if (form.confirmPassword !== form.password) nextErrors.confirmPassword = "รหัสผ่านไม่ตรงกัน";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await register({
        email: form.email,
        password: form.password,
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber || undefined,
      });
      toast.success("สมัครสมาชิกสำเร็จ");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-full flex-1 md:grid-cols-2">
      {/* Form panel */}
      <div className="relative flex flex-col items-center justify-center gap-8 bg-background px-6 py-10 sm:px-10">
        <Link
          href="/login"
          className="absolute right-6 top-6 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          เข้าสู่ระบบ
        </Link>

        <Link href="/" className="flex items-center gap-2 font-heading text-lg font-bold text-primary md:hidden">
          <Leaf className="size-6" aria-hidden />
          PalmGuard
        </Link>

        <div className="flex w-full max-w-sm flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold">สมัครสมาชิก</h1>
            <p className="text-muted-foreground">สร้างบัญชีเพื่อเริ่มใช้งาน PalmGuard AI</p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName">ชื่อ-นามสกุล</Label>
              <Input
                id="fullName"
                className="h-11"
                placeholder="สมชาย ใจดี"
                value={form.fullName}
                onChange={(e) => update("fullName", e.target.value)}
                aria-invalid={!!errors.fullName}
              />
              {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">อีเมล</Label>
              <Input
                id="email"
                type="email"
                className="h-11"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phoneNumber">เบอร์โทร (ไม่บังคับ)</Label>
              <Input
                id="phoneNumber"
                type="tel"
                className="h-11"
                placeholder="0891234567"
                value={form.phoneNumber}
                onChange={(e) => update("phoneNumber", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <Input
                id="password"
                type="password"
                className="h-11"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                aria-invalid={!!errors.password}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmPassword">ยืนยันรหัสผ่าน</Label>
              <Input
                id="confirmPassword"
                type="password"
                className="h-11"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)}
                aria-invalid={!!errors.confirmPassword}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>
            <Button type="submit" size="lg" className="h-11 w-full" disabled={submitting}>
              {submitting ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            มีบัญชีอยู่แล้ว?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              เข้าสู่ระบบ
            </Link>
          </p>
        </div>
      </div>

      <AuthHeroPanel
        images={HERO_IMAGES}
        badge="เริ่มต้นวันนี้"
        headline={
          <>
            ดูแลสวนปาล์ม
            <br />
            ได้ง่ายขึ้นด้วย AI
          </>
        }
        subtext="สมัครสมาชิกฟรี เก็บประวัติการวินิจฉัยและรับคำแนะนำเฉพาะสวนของคุณ"
      />
    </div>
  );
}
