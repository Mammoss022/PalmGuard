"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SurveyForm } from "@/components/survey/survey-form";
import { SurveyAnswers } from "@/components/survey/survey-answers";
import { getSurveyStatus, type SurveyStatus } from "@/lib/surveys";
import type { SatisfactionSurvey } from "@/lib/types";

export default function SurveyPage() {
  const [status, setStatus] = useState<SurveyStatus | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    getSurveyStatus().then(value => { if (!cancelled) setStatus(value); }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);
  function submitted(survey: SatisfactionSurvey) { setStatus({ hasSubmitted: true, eligibleForPrompt: false, survey }); }
  if (error) return <div className="py-10 text-center"><p>โหลดสถานะแบบประเมินไม่สำเร็จ</p><Button className="mt-3" onClick={() => window.location.reload()}>ลองใหม่</Button></div>;
  if (!status) return <div className="flex justify-center py-16"><Loader2 className="animate-spin" aria-label="กำลังโหลดแบบประเมิน" /></div>;
  return <div className="mx-auto flex max-w-2xl flex-col gap-6">
    <div><span className="text-xs font-bold text-primary">แบบประเมิน</span><h1 className="text-2xl font-bold">แบบประเมินความพึงพอใจ</h1><p className="text-muted-foreground">ความคิดเห็นของคุณช่วยให้เราปรับปรุง PalmGuard</p></div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2">{status.hasSubmitted && <ClipboardCheck className="text-success" />}{status.hasSubmitted ? "คุณส่งแบบประเมินแล้ว" : "ประเมินประสบการณ์การใช้งาน"}</CardTitle></CardHeader>
      <CardContent>{status.survey ? <><p className="mb-4 text-sm text-muted-foreground">ขอบคุณสำหรับความคิดเห็น ระบบจะไม่แสดงหน้าต่างชวนทำซ้ำ คำตอบที่ส่งแล้วดูได้อย่างเดียว</p><SurveyAnswers survey={status.survey} /></> : <SurveyForm onSubmitted={submitted} />}</CardContent>
    </Card>
    <Button asChild variant="outline"><Link href="/dashboard">กลับหน้าหลัก</Link></Button>
  </div>;
}
