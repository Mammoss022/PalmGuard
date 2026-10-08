"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Send, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StarRating } from "@/components/survey/star-rating";
import { createSurvey, getSurveyStatus } from "@/lib/surveys";
import { ApiError } from "@/lib/api-client";
import type { SatisfactionSurvey } from "@/lib/types";

export function SurveyForm({ onSubmitted }: { onSubmitted: (survey: SatisfactionSurvey) => void }) {
  const [satisfactionRating, setSatisfactionRating] = useState(0);
  const [easeOfUseRating, setEaseOfUseRating] = useState(0);
  const [accuracyRating, setAccuracyRating] = useState(0);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = satisfactionRating > 0 && easeOfUseRating > 0 && accuracyRating > 0 && wouldRecommend !== null;

  async function submit() {
    if (!canSubmit || wouldRecommend === null || submitting) return;
    setSubmitting(true);
    try {
      const result = await createSurvey({ satisfactionRating, easeOfUseRating, accuracyRating, wouldRecommend, comments: comments.trim() || undefined });
      onSubmitted(result);
      window.dispatchEvent(new Event("palmguard:survey-submitted"));
      toast.success("ขอบคุณสำหรับความคิดเห็น");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const status = await getSurveyStatus().catch(() => null);
        if (status?.survey) {
          onSubmitted(status.survey);
          window.dispatchEvent(new Event("palmguard:survey-submitted"));
        }
      }
      toast.error(err instanceof ApiError ? err.message : "ส่งแบบประเมินไม่สำเร็จ กรุณาลองใหม่");
    } finally { setSubmitting(false); }
  }

  return <form onSubmit={event => { event.preventDefault(); void submit(); }}>
    <fieldset disabled={submitting} className="flex flex-col gap-5">
      <StarRating label="ความพึงพอใจโดยรวมต่อระบบ" value={satisfactionRating} onChange={setSatisfactionRating} />
      <StarRating label="ความง่ายในการใช้งาน" value={easeOfUseRating} onChange={setEaseOfUseRating} />
      <StarRating label="ความแม่นยำของผลวินิจฉัยที่ได้รับ" value={accuracyRating} onChange={setAccuracyRating} />
      <div className="space-y-2"><Label>คุณจะแนะนำระบบนี้ให้เกษตรกรท่านอื่นหรือไม่</Label><div className="grid grid-cols-2 gap-3">
        <Button type="button" className="h-11" variant={wouldRecommend === true ? "default" : "outline"} aria-pressed={wouldRecommend === true} onClick={() => setWouldRecommend(true)}><ThumbsUp /> แนะนำ</Button>
        <Button type="button" className="h-11" variant={wouldRecommend === false ? "destructive" : "outline"} aria-pressed={wouldRecommend === false} onClick={() => setWouldRecommend(false)}><ThumbsDown /> ไม่แนะนำ</Button>
      </div></div>
      <div className="space-y-2"><Label htmlFor="survey-comments">ความคิดเห็นเพิ่มเติม (ถ้ามี)</Label><Textarea id="survey-comments" rows={3} maxLength={1000} placeholder="ข้อเสนอแนะเพื่อปรับปรุงระบบ..." value={comments} onChange={event => setComments(event.target.value)} /></div>
      <p className="text-xs text-muted-foreground">คำตอบจะบันทึกในบัญชีของคุณและส่งให้ผู้ดูแลใช้ปรับปรุงระบบ เมื่อส่งแล้วจะไม่สามารถแก้ไขได้</p>
      <Button type="submit" size="lg" className="h-11 w-full" disabled={!canSubmit || submitting}><Send /> {submitting ? "กำลังส่ง..." : "ส่งแบบประเมิน"}</Button>
    </fieldset>
  </form>;
}
