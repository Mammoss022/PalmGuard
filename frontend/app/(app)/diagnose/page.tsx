"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  ImageUp,
  Leaf,
  Lightbulb,
  Loader2,
  ShieldCheck,
  UploadCloud,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createDiagnosis } from "@/lib/diagnoses";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const photoTips = [
  "ถ่ายในที่มีแสงสว่างเพียงพอ ไม่ย้อนแสง",
  "เห็นใบชัดเจนทั้งใบ ไม่เบลอ",
  "ถ่ายใกล้พอให้เห็นรายละเอียดผิวใบ",
];

export default function DiagnosePage() {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  function handleFile(selected: File | undefined) {
    if (!selected) return;
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  function handleClear() {
    setFile(null);
    setPreviewUrl(null);
  }

  async function handleSubmit() {
    if (!file) return;
    setAnalyzing(true);
    try {
      const diagnosis = await createDiagnosis(file);
      router.push(`/diagnose/${diagnosis.id}/result`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "วิเคราะห์ภาพไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <Link
          href="/dashboard"
          className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> กลับหน้าหลัก
        </Link>
        <span className="block text-xs font-bold tracking-wide text-primary">วินิจฉัย</span>
        <h1 className="text-2xl font-bold">วินิจฉัยใบปาล์ม 🌿</h1>
        <p className="text-muted-foreground">
          ถ่ายภาพหรืออัปโหลดภาพใบปาล์ม 1 ภาพ เพื่อวิเคราะห์และรับคำแนะนำเบื้องต้น
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* Dropzone */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => !analyzing && galleryInputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && !analyzing && galleryInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              if (!analyzing) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (!analyzing) handleFile(e.dataTransfer.files?.[0]);
            }}
            className={cn(
              "relative flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed transition-colors md:aspect-[2/1]",
              analyzing && "pointer-events-none opacity-70",
              isDragging ? "border-primary bg-accent" : "border-border bg-muted/40 hover:border-primary/50"
            )}
          >
            {!previewUrl && (
              <>
                <Leaf
                  aria-hidden
                  className="pointer-events-none absolute -left-4 -top-4 size-24 rotate-[-25deg] text-primary/10"
                />
                <Leaf
                  aria-hidden
                  className="pointer-events-none absolute -bottom-6 -right-6 size-32 rotate-[150deg] text-primary/10"
                />
              </>
            )}

            {previewUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="ตัวอย่างภาพใบปาล์ม" className="size-full object-cover" />
                <button
                  type="button"
                  aria-label="ลบภาพ"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                  className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-card/90 text-foreground shadow backdrop-blur hover:bg-card"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </>
            ) : (
              <div className="relative flex flex-col items-center gap-2 px-6 text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UploadCloud className="size-6" aria-hidden />
                </span>
                <p className="font-bold">ลากและวางไฟล์ที่นี่</p>
                <p className="text-sm font-medium text-primary">หรือคลิกเพื่อเลือกไฟล์</p>
                <p className="text-xs text-muted-foreground">รองรับไฟล์ JPG, PNG (ขนาดไม่เกิน 10MB)</p>
              </div>
            )}

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>

          {/* Alternate upload methods */}
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">หรือเลือกวิธีอัปโหลด</p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11"
                disabled={analyzing}
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera /> ถ่ายภาพจากกล้อง
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11"
                disabled={analyzing}
                onClick={() => galleryInputRef.current?.click()}
              >
                <ImageUp /> เลือกจากคลังภาพ
              </Button>
            </div>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>

          {/* Privacy note */}
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-4">
            <ShieldCheck className="size-5 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="text-sm font-semibold">ภาพของคุณปลอดภัย</p>
              <p className="text-xs text-muted-foreground">
                ภาพที่อัปโหลดจะถูกเก็บไว้อย่างปลอดภัยเพื่อการวิเคราะห์และแสดงในประวัติของคุณเท่านั้น
                มีเพียงคุณ (และผู้ดูแลระบบ) ที่เข้าถึงได้
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="lg"
              className="h-12 flex-1"
              disabled={!file || analyzing}
              onClick={handleSubmit}
            >
              {analyzing ? (
                <>
                  <Loader2 className="animate-spin" /> กำลังวิเคราะห์...
                </>
              ) : (
                "ส่งวิเคราะห์"
              )}
            </Button>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Zap className="size-4 text-warning" aria-hidden /> พร้อมวิเคราะห์ทันที
            </span>
          </div>

          <Alert>
            <AlertDescription>
              ผลการวิเคราะห์เป็นคำแนะนำเบื้องต้นเท่านั้น ไม่ใช่การวินิจฉัยทางการเกษตรอย่างเป็นทางการ
            </AlertDescription>
          </Alert>
        </div>

        {/* Tips */}
        <Card className="h-fit">
          <CardHeader>
            <span className="flex size-9 items-center justify-center rounded-full bg-warning/20 text-warning-foreground">
              <Lightbulb className="size-4" aria-hidden />
            </span>
            <CardTitle className="mt-2 text-base">เคล็ดลับการถ่ายภาพ</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {photoTips.map((tip) => (
                <li key={tip} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
