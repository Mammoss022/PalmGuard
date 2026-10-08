import { formatThaiDateTime } from "@/lib/disease-ui";
import type { SatisfactionSurvey } from "@/lib/types";

export function SurveyAnswers({ survey }: { survey: SatisfactionSurvey }) {
  return <div className="space-y-3 text-sm">
    <p className="text-muted-foreground">ส่งเมื่อ {formatThaiDateTime(survey.createdAt)}</p>
    <dl className="grid gap-2 sm:grid-cols-2">
      {[
        ["ความพึงพอใจโดยรวม", `${survey.satisfactionRating} / 5`],
        ["ความง่ายในการใช้งาน", `${survey.easeOfUseRating} / 5`],
        ["ความแม่นยำตามความคิดเห็นผู้ใช้", `${survey.accuracyRating} / 5`],
        ["แนะนำให้ผู้อื่น", survey.wouldRecommend ? "แนะนำ" : "ไม่แนะนำ"],
      ].map(([label, value]) => <div key={label} className="rounded-xl bg-muted/50 p-3"><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}
    </dl>
    <div><p className="font-medium">ความคิดเห็นเพิ่มเติม</p><p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">{survey.comments || "ไม่ได้ระบุความคิดเห็น"}</p></div>
  </div>;
}
