"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardCheck, ClipboardList, Send, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StarRating } from "@/components/survey/star-rating";
import { createSurvey } from "@/lib/surveys";
import { ApiError } from "@/lib/api-client";

const whyItMatters = [
  "ใช้เป็นข้อมูลประกอบการประเมินระบบตามแผนงานวิจัย (UAT)",
  "ช่วยชี้จุดที่ควรปรับปรุงการใช้งานจริง",
  "ความเห็นทุกข้อจะถูกนำไปพัฒนาระบบต่อ ไม่ใช่แบบสอบถามลอย",
];

export default function SurveyPage() {
  const router = useRouter();
  const [satisfactionRating, setSatisfactionRating] = useState(0);
  const [easeOfUseRating, setEaseOfUseRating] = useState(0);
  const [accuracyRating, setAccuracyRating] = useState(0);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit =
    satisfactionRating > 0 && easeOfUseRating > 0 && accuracyRating > 0 && wouldRecommend !== null;

  async function handleSubmit() {
    if (!canSubmit || wouldRecommend === null) return;
    setSubmitting(true);
    try {
      await createSurvey({
        satisfactionRating,
        easeOfUseRating,
        accuracyRating,
        wouldRecommend,
        comments: comments.trim() || undefined,
      });
      setSubmitted(true);
      toast.success("ขอบคุณสำหรับความคิดเห็น");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "ส่งแบบสอบถามไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-success/15 text-success">
          <ClipboardCheck className="size-8" aria-hidden />
        </span>
        <h1 className="text-xl font-bold">ขอบคุณสำหรับความคิดเห็น</h1>
        <p className="text-muted-foreground">
          คำตอบของคุณช่วยให้ทีมพัฒนาปรับปรุงระบบ PalmGuard ให้ดียิ่งขึ้น
        </p>
        <Button size="lg" className="h-11" onClick={() => router.push("/dashboard")}>
          กลับหน้าหลัก
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <span className="text-xs font-bold tracking-wide text-primary">แบบสอบถาม</span>
        <h1 className="text-2xl font-bold">แบบสอบถามความพึงพอใจ</h1>
        <p className="text-muted-foreground">
          ช่วยประเมินการใช้งานระบบ PalmGuard เพื่อนำไปพัฒนาปรับปรุงต่อไป (ใช้เวลาไม่ถึง 1 นาที)
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <span className="flex size-9 items-center justify-center rounded-full bg-accent text-primary">
              <ClipboardList className="size-4" aria-hidden />
            </span>
            <CardTitle className="mt-2">ความพึงพอใจโดยรวม</CardTitle>
            <CardDescription>ให้คะแนนประสบการณ์การใช้งานระบบในแต่ละด้าน</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <StarRating
              label="ความพึงพอใจโดยรวมต่อระบบ"
              value={satisfactionRating}
              onChange={setSatisfactionRating}
            />
            <StarRating
              label="ความง่ายในการใช้งาน"
              value={easeOfUseRating}
              onChange={setEaseOfUseRating}
            />
            <StarRating
              label="ความแม่นยำของผลวินิจฉัยที่ได้รับ"
              value={accuracyRating}
              onChange={setAccuracyRating}
            />

            <div className="flex flex-col gap-1.5">
              <Label>คุณจะแนะนำระบบนี้ให้เกษตรกรท่านอื่นหรือไม่</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={wouldRecommend === true ? "default" : "outline"}
                  className="h-11"
                  onClick={() => setWouldRecommend(true)}
                >
                  <ThumbsUp /> แนะนำ
                </Button>
                <Button
                  type="button"
                  variant={wouldRecommend === false ? "destructive" : "outline"}
                  className="h-11"
                  onClick={() => setWouldRecommend(false)}
                >
                  <ThumbsDown /> ไม่แนะนำ
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="comments">ความคิดเห็นเพิ่มเติม (ถ้ามี)</Label>
              <Textarea
                id="comments"
                placeholder="ข้อเสนอแนะเพื่อปรับปรุงระบบ..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
              />
            </div>

            <Button size="lg" className="h-11 w-full" disabled={!canSubmit || submitting} onClick={handleSubmit}>
              <Send /> {submitting ? "กำลังส่ง..." : "ส่งแบบสอบถาม"}
            </Button>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">ทำไมความเห็นของคุณสำคัญ</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {whyItMatters.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
