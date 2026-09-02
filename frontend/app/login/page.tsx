"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthHeroPanel } from "@/components/auth/auth-hero-panel";
import { login } from "@/lib/auth";
import { ApiError } from "@/lib/api-client";

const HERO_IMAGES = ["/auth-hero-1.png", "/auth-hero-2.png"];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) nextErrors.email = "รูปแบบอีเมลไม่ถูกต้อง";
    if (password.length < 8) nextErrors.password = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await login(email, password);
      toast.success("เข้าสู่ระบบสำเร็จ");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-full flex-1 md:grid-cols-2">
      <AuthHeroPanel
        images={HERO_IMAGES}
        badge="วินิจฉัยด้วย AI"
        headline={
          <>
            ตรวจใบปาล์มน้ำมัน
            <br />
            ได้ในไม่กี่วินาที
          </>
        }
        subtext="ถ่ายภาพหรืออัปโหลดภาพใบปาล์ม รับผลวิเคราะห์เบื้องต้นและคำแนะนำได้ทันที"
      />

      {/* Form panel */}
      <div className="relative flex flex-col items-center justify-center gap-8 bg-background px-6 py-10 sm:px-10">
        <Link
          href="/register"
          className="absolute right-6 top-6 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          สมัครสมาชิก
        </Link>

        <Link href="/" className="flex items-center gap-2 font-heading text-lg font-bold text-primary md:hidden">
          <Leaf className="size-6" aria-hidden />
          PalmGuard
        </Link>

        <div className="flex w-full max-w-sm flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold">ยินดีต้อนรับกลับ</h1>
            <p className="text-muted-foreground">เข้าสู่ระบบเพื่อเริ่มวินิจฉัยใบปาล์มน้ำมันของคุณ</p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">อีเมลของคุณ</Label>
              <Input
                id="email"
                type="email"
                className="h-11"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="h-11 pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            <Button type="submit" size="lg" className="h-11 w-full" disabled={submitting}>
              {submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            ยังไม่มีบัญชี?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              สมัครสมาชิก
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
