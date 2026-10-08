"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Dialog } from "radix-ui";
import { ClipboardList, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { getSurveyStatus } from "@/lib/surveys";
import { SurveyForm } from "@/components/survey/survey-form";

export function SurveyPrompt() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const eligiblePage = pathname === "/dashboard" || /^\/diagnose\/[^/]+\/result$/.test(pathname);
  const key = `palmguard:survey-deferred:${user.id}`;

  useEffect(() => {
    function completed() { setOpen(false); }
    window.addEventListener("palmguard:survey-submitted", completed);
    return () => window.removeEventListener("palmguard:survey-submitted", completed);
  }, []);

  useEffect(() => {
    if (user.role === "admin" || !eligiblePage) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function deferred() {
      try { return sessionStorage.getItem(key) === "yes"; } catch { return false; }
    }
    async function check() {
      clearTimeout(timer);
      try {
        const status = await getSurveyStatus();
        if (cancelled) return;
        if (status.hasSubmitted) { setOpen(false); return; }
        if (!status.eligibleForPrompt || deferred()) return;
        timer = setTimeout(async () => {
          // Another tab may have submitted while this timer was running.
          const latest = await getSurveyStatus().catch(() => null);
          if (!cancelled && latest?.eligibleForPrompt && !latest.hasSubmitted && !deferred()) setOpen(true);
        }, 8000);
      } catch { /* A failed status request must never imply no prior response. */ }
    }
    function completed() { clearTimeout(timer); setOpen(false); }
    function visibility() { if (document.visibilityState === "visible") void check(); }
    void check();
    window.addEventListener("palmguard:survey-submitted", completed);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("palmguard:survey-submitted", completed);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [user.id, user.role, eligiblePage, pathname, key]);

  function dismiss() {
    try { sessionStorage.setItem(key, "yes"); } catch { /* Continue when storage is unavailable. */ }
    setOpen(false);
  }

  return <Dialog.Root open={open && eligiblePage && user.role !== "admin"} onOpenChange={value => { if (!value) dismiss(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border bg-card p-5 shadow-xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div><Dialog.Title className="flex items-center gap-2 text-lg font-bold"><ClipboardList className="size-5 text-primary" /> ช่วยประเมิน PalmGuard</Dialog.Title><Dialog.Description className="mt-1 text-sm text-muted-foreground">คุณได้ลองวินิจฉัยแล้ว ช่วยบอกประสบการณ์เพื่อให้เราปรับปรุงระบบ ใช้เวลาประมาณ 1 นาที</Dialog.Description></div>
          <Dialog.Close asChild><Button size="icon" variant="ghost" aria-label="ปิดแบบประเมิน"><X /></Button></Dialog.Close>
        </div>
        <SurveyForm onSubmitted={() => setOpen(false)} />
        <Button variant="ghost" className="mt-2 w-full" onClick={dismiss}>ไว้ทำภายหลัง</Button>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
