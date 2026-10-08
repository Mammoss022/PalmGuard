"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  Camera,
  Crop,
  ImageUp,
  Leaf,
  Lightbulb,
  Loader2,
  ShieldCheck,
  UploadCloud,
  X,
  Zap,
  Sprout,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import styles from "./diagnose.module.css";
import { createDiagnosis } from "@/lib/diagnoses";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { ImageCropDialog, validateLeafImage } from "@/components/diagnosis/image-crop-dialog";

const photoTips = [
  "ถ่ายในที่มีแสงสว่างเพียงพอ ไม่ย้อนแสง",
  "เห็นใบชัดเจน ทั้งใบ ไม่เบลอ",
  "ถ่ายให้เห็นพื้นที่ที่สงสัยหรือมีอาการผิดปกติ",
  "ควรถ่ายจากหลายมุม เพื่อความแม่นยำในการวิเคราะห์",
];

export default function DiagnosePage() {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function acceptImage(selected: File) {
    setOriginalFile(cropFile);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setCropFile(null);
  }

  function handleFile(selected: File | undefined) {
    if (!selected || analyzing) return;
    const error = validateLeafImage(selected);
    if (error) { toast.error(error); return; }
    setCropFile(selected);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  function handleClear() {
    setFile(null);
    setPreviewUrl(null);
    setOriginalFile(null);
    setCropFile(null);
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
    <div className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true"><div className={styles.palmPhoto} /><Leaf className={styles.backgroundLeaf} /></div>
      {cropFile && <ImageCropDialog file={cropFile} onCancel={() => setCropFile(null)} onConfirm={acceptImage} />}
      <div className={styles.intro}>
        <div className={styles.introMark} aria-hidden="true"><Leaf /><span><Sprout /></span></div>
        <div><span className={styles.eyebrow}>ระบบตรวจวิเคราะห์โรคใบปาล์มด้วย AI</span>
        <h1 className={styles.title}>วินิจฉัยใบปาล์ม</h1>
        <p className={styles.subtitle}>อัปโหลดภาพใบปาล์มเพื่อให้ระบบวิเคราะห์โรค ช่วยให้คุณดูแลสวนได้อย่างแม่นยำและรวดเร็ว</p></div>
      </div>

      <div className={styles.columns}>
        <div className={styles.uploadPanel}>
          {/* Dropzone */}
          <div
            role="button"
            aria-label="เลือกภาพใบปาล์มเพื่อวิเคราะห์"
            aria-disabled={analyzing}
            tabIndex={0}
            onClick={() => !analyzing && galleryInputRef.current?.click()}
            onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !analyzing) { e.preventDefault(); galleryInputRef.current?.click(); } }}
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
              styles.dropzone,
              analyzing && "pointer-events-none opacity-70",
              isDragging && styles.dragging
            )}
          >
            {!previewUrl && (
              <>
                <Leaf
                  aria-hidden
                  className={styles.dropLeafTop}
                />
                <Leaf
                  aria-hidden
                  className={styles.dropLeafBottom}
                />
              </>
            )}

            {previewUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="ตัวอย่างภาพใบปาล์มที่จะส่งวิเคราะห์" className="size-full object-contain" />
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
              <div className={styles.dropContent}>
                <span className={styles.uploadIcon}>
                  <UploadCloud aria-hidden />
                </span>
                <p className={styles.dropTitle}>ลากและวางไฟล์ที่นี่</p>
                <p className={styles.dropHint}>หรือคลิกเพื่อเลือกไฟล์</p>
                <p className={styles.fileHint}>รองรับไฟล์ JPG, PNG, WEBP (ขนาดไม่เกิน 10MB)</p>
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

          {file && originalFile && <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">ภาพตัวอย่างนี้คือภาพที่จะส่งวิเคราะห์</p>
            <Button variant="outline" disabled={analyzing} onClick={() => setCropFile(originalFile)}><Crop /> ครอปภาพอีกครั้ง</Button>
          </div>}

          {/* Alternate upload methods */}
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">หรือเลือกวิธีอัปโหลด</p>
            <div className={styles.uploadMethods}>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className={styles.methodButton}
                disabled={analyzing}
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera /> ถ่ายภาพจากกล้อง <ChevronRight className={styles.chevron} />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className={styles.methodButton}
                disabled={analyzing}
                onClick={() => galleryInputRef.current?.click()}
              >
                <ImageUp /> เลือกจากคลังภาพ <ChevronRight className={styles.chevron} />
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
          <div className={styles.privacy}>
            <ShieldCheck className="size-5 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="text-sm font-semibold">ภาพของคุณปลอดภัย</p>
              <p className="text-xs text-muted-foreground">
                ภาพที่อัปโหลดจะถูกเก็บไว้อย่างปลอดภัยเพื่อการวิเคราะห์และแสดงในประวัติของคุณเท่านั้น
                มีเพียงคุณ (และผู้ดูแลระบบ) ที่เข้าถึงได้
              </p>
            </div>
          </div>

          <div className={styles.submitRow}>
            <Button
              type="button"
              size="lg"
              className={styles.submitButton}
              disabled={!file || analyzing}
              onClick={handleSubmit}
            >
              {analyzing ? (
                <>
                  <Loader2 className="animate-spin" /> กำลังวิเคราะห์...
                </>
              ) : (
                <><TrendingUp /> ส่งวิเคราะห์ <ChevronRight /></>
              )}
            </Button>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Zap className="size-4 text-warning" aria-hidden /> พร้อมวิเคราะห์ทันที
            </span>
          </div>

        </div>

        {/* Tips */}
        <aside className={styles.sidebar}>
          <section className={styles.tipsPanel}>
            <h2 className={styles.sideHeading}><span className={styles.sideIcon}><Lightbulb aria-hidden /></span>เคล็ดลับการถ่ายภาพ</h2>
            <ul className={styles.tips}>
              {photoTips.map((tip) => (
                <li key={tip}>
                  <span className={styles.checkIcon} aria-hidden><Check /></span>
                  {tip}
                </li>
              ))}
            </ul>
          </section>
          <section className={styles.samplesPanel}>
            <h2 className={styles.samplesHeading}><span className={styles.sideIcon}><Sprout aria-hidden /></span>ตัวอย่างภาพที่แนะนำ</h2>
            <div className={styles.samples}>
              {["ใบปกติ", "โรคใบจุด", "เพลี้ยหอย"].map((label, index) => <figure key={label}><div role="img" aria-label={`ภาพประกอบ${label}`} className={styles.sampleImage} style={{ backgroundPosition: `${index * 50}% center` }} /><figcaption>{label}</figcaption></figure>)}
            </div>
            <p className={styles.sampleNote}>ภาพประกอบตัวอย่างอาการ</p>
          </section>
          <p className={styles.motto}>ใบปาล์มสุขภาพดี<br /><span>เริ่มได้จากการตรวจที่ถูกต้อง</span><Leaf aria-hidden /></p>
        </aside>
      </div>
    </div>
  );
}
