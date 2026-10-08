"use client";

import { useCallback, useRef, useState, type PointerEvent } from "react";
import { Dialog } from "radix-ui";
import { Crop, Loader2, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Rectangle = { x: number; y: number; width: number; height: number };
const initialCrop: Rectangle = { x: 10, y: 10, width: 80, height: 80 };
const outputSize = 224;

function centeredSquare(image: HTMLImageElement): Rectangle {
  const side = Math.min(image.naturalWidth, image.naturalHeight) * 0.8;
  const width = side / image.naturalWidth * 100;
  const height = side / image.naturalHeight * 100;
  return { x: (100 - width) / 2, y: (100 - height) / 2, width, height };
}

export function validateLeafImage(file: File): string | null {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return "กรุณาเลือกภาพ JPG, PNG หรือ WEBP";
  }
  if (file.size > 10 * 1024 * 1024) return "ภาพต้องมีขนาดไม่เกิน 10MB";
  return null;
}

export function ImageCropDialog({ file, onCancel, onConfirm, confirmLabel = "ใช้ภาพที่ครอป" }: {
  file: File;
  onCancel: () => void;
  onConfirm: (file: File) => void;
  confirmLabel?: string;
}) {
  const [crop, setCrop] = useState<Rectangle>(initialCrop);
  const [ready, setReady] = useState(false);
  const [imageRatio, setImageRatio] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const imageRef = useRef<HTMLImageElement>(null);
  const startRef = useRef<{ x: number; y: number; previous: Rectangle } | null>(null);

  const mountImage = useCallback((node: HTMLImageElement | null) => {
    if (!node) return;
    imageRef.current = node;
    const url = URL.createObjectURL(file);
    node.src = url;
    return () => {
      URL.revokeObjectURL(url);
      imageRef.current = null;
    };
  }, [file]);

  function point(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, (event.clientX - bounds.left) / bounds.width * 100)),
      y: Math.max(0, Math.min(100, (event.clientY - bounds.top) / bounds.height * 100)),
    };
  }

  function finishSelection(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const start = startRef.current;
    if (!start) return;
    const end = point(event);
    if (cancelled || Math.abs(end.x - start.x) < 2 || Math.abs(end.y - start.y) < 2) {
      setCrop(start.previous);
    }
    startRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  async function confirmCrop(fullImage = false) {
    const image = imageRef.current;
    if (!image || !ready || saving) return;
    setSaving(true);
    setError(undefined);
    try {
      const sx = fullImage ? 0 : Math.round(crop.x / 100 * image.naturalWidth);
      const sy = fullImage ? 0 : Math.round(crop.y / 100 * image.naturalHeight);
      const side = Math.min(image.naturalWidth - sx, image.naturalHeight - sy, Math.round(crop.width / 100 * image.naturalWidth));
      const width = fullImage ? image.naturalWidth : side;
      const height = fullImage ? image.naturalHeight : side;
      if (width < 32 || height < 32) throw new Error("พื้นที่ที่เลือกเล็กเกินไป กรุณาเลือกส่วนใบให้กว้างขึ้น");
      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("ไม่สามารถครอปภาพได้ กรุณาลองใหม่");
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      const scale = outputSize / Math.max(width, height);
      const targetWidth = width * scale;
      const targetHeight = height * scale;
      context.drawImage(image, sx, sy, width, height, (outputSize - targetWidth) / 2, (outputSize - targetHeight) / 2, targetWidth, targetHeight);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(value => value ? resolve(value) : reject(new Error("บันทึกภาพไม่สำเร็จ")), "image/jpeg", 0.95);
      });
      const cropped = new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-cropped.jpg`, { type: "image/jpeg" });
      const validation = validateLeafImage(cropped);
      if (validation) throw new Error(validation);
      onConfirm(cropped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ครอปภาพไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog.Root open onOpenChange={open => { if (!open && !saving) onCancel(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[94dvh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border bg-card p-4 shadow-xl sm:p-6">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="flex items-center gap-2 text-lg font-bold"><Crop className="size-5 text-primary" /> ครอปเฉพาะส่วนใบ</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">ลากบนภาพเพื่อเลือกส่วนใบที่ต้องการ ให้เห็นรายละเอียดบริเวณที่มีอาการชัดเจน</Dialog.Description>
            </div>
            <Dialog.Close asChild><Button variant="ghost" size="icon" disabled={saving} aria-label="ยกเลิกการครอป"><X /></Button></Dialog.Close>
          </div>
          <div className="flex min-h-32 items-center justify-center overflow-hidden rounded-xl bg-black/90">
            <div
              className="relative max-w-full touch-none select-none overflow-hidden"
              data-testid="crop-surface"
              onPointerDown={event => {
                if (!ready || saving || !event.isPrimary || event.button !== 0) return;
                event.preventDefault();
                const start = point(event);
                startRef.current = { ...start, previous: crop };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={event => {
                const start = startRef.current;
                if (!start) return;
                const end = point(event);
                const image = imageRef.current;
                if (!image) return;
                const side = Math.min(Math.abs(end.x - start.x) / 100 * image.naturalWidth, Math.abs(end.y - start.y) / 100 * image.naturalHeight);
                const width = side / image.naturalWidth * 100;
                const height = side / image.naturalHeight * 100;
                setCrop({ x: end.x < start.x ? start.x - width : start.x, y: end.y < start.y ? start.y - height : start.y, width, height });
              }}
              onPointerUp={event => finishSelection(event)}
              onPointerCancel={event => finishSelection(event, true)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img ref={mountImage} alt="ภาพต้นฉบับสำหรับเลือกพื้นที่ครอป" draggable={false} className="block max-h-[45dvh] max-w-full cursor-crosshair object-contain" onLoad={event => { setCrop(centeredSquare(event.currentTarget)); setImageRatio(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight); setReady(true); }} onError={() => { setReady(false); setError("เปิดภาพไม่ได้ กรุณาเลือกภาพอื่น"); }} />
              {ready && <div className="pointer-events-none absolute border-2 border-white bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" data-testid="crop-selection" style={{ left: `${crop.x}%`, top: `${crop.y}%`, width: `${crop.width}%`, height: `${crop.height}%` }}>
                <div className="absolute inset-x-0 top-1/3 border-t border-white/40" /><div className="absolute inset-x-0 bottom-1/3 border-t border-white/40" />
                <div className="absolute inset-y-0 left-1/3 border-l border-white/40" /><div className="absolute inset-y-0 right-1/3 border-l border-white/40" />
              </div>}
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">กรอบครอปสัดส่วน 1:1 • ภาพที่ส่งวิเคราะห์มีขนาด 224×224 พิกเซล หากใช้ภาพเต็ม ระบบจะเติมขอบเพื่อรักษาสัดส่วนภาพ</p>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-muted-foreground">ปรับตำแหน่งและขนาดละเอียด</summary>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {([
                ["x", "ตำแหน่งแนวนอน", 100 - crop.width],
                ["y", "ตำแหน่งแนวตั้ง", 100 - crop.height],
                ["width", "ขนาดกรอบ", Math.min(100 - crop.x, (100 - crop.y) / imageRatio)],
              ] as const).map(([key, label, max]) => <label key={key} className="flex flex-col gap-1">
                <span>{label}</span>
                <input type="range" min={key === "width" ? 2 : 0} max={max} step="0.1" value={crop[key]} disabled={!ready || saving} onChange={event => { const value = Number(event.target.value); setCrop(previous => key === "width" ? { ...previous, width: value, height: value * imageRatio } : { ...previous, [key]: value }); }} className="w-full accent-primary" />
              </label>)}
            </div>
          </details>
          {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="ghost" disabled={!ready || saving} onClick={() => { if (imageRef.current) setCrop(centeredSquare(imageRef.current)); }}><RotateCcw /> เริ่มเลือกใหม่</Button>
            <Button variant="outline" disabled={!ready || saving} onClick={() => confirmCrop(true)}>ใช้ภาพเต็ม</Button>
            <Button className="ml-auto" disabled={!ready || saving || crop.width < 2 || crop.height < 2} onClick={() => confirmCrop()}>{saving ? <Loader2 className="animate-spin" /> : <Crop />}{confirmLabel}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
