"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { getSurveySummary, listAdminSurveys, type AdminSurvey, type RatingCount, type SurveySummary } from "@/lib/admin";
import { SurveyAnswers } from "@/components/survey/survey-answers";

function RatingChart({ title, average, counts }: { title: string; average: number | null; counts: RatingCount[] }) {
  const max = Math.max(1, ...counts.map(item => item.count));
  return <Card><CardHeader><CardTitle className="text-base">{title}</CardTitle><p className="text-sm text-muted-foreground">เฉลี่ย <span className="font-bold text-foreground">{average?.toFixed(2) ?? "—"}</span> / 5</p></CardHeader><CardContent>
    <div className="space-y-3" role="img" aria-label={`${title}: ${counts.map(item => `${item.score} คะแนน ${item.count} คน`).join(", ")}`}>
      {counts.map(item => <div key={item.score} className="flex items-center gap-3 text-sm"><span className="w-12 shrink-0">{item.score} ดาว</span><div className="h-6 flex-1 overflow-hidden rounded bg-muted"><div className={`h-full rounded ${item.score <= 2 ? "bg-warning" : "bg-primary"}`} style={{ width: `${item.count / max * 100}%` }} /></div><span className="w-12 text-right tabular-nums">{item.count} คน</span></div>)}
    </div>
  </CardContent></Card>;
}

export default function AdminSurveysPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<SurveySummary | null>(null);
  const [responses, setResponses] = useState<AdminSurvey[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadedPage, setLoadedPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (user.role !== "admin") { router.replace("/dashboard"); return; }
    let cancelled = false;
    Promise.all([getSurveySummary(), listAdminSurveys({ page, pageSize: 10 })]).then(([stats, list]) => {
      if (cancelled) return;
      setSummary(stats); setResponses(list.items); setTotal(list.total); setLoadedPage(page); setError(null);
    }).catch(() => { if (!cancelled) setError("โหลดผลแบบประเมินไม่สำเร็จ กรุณาลองใหม่"); });
    return () => { cancelled = true; };
  }, [user.role, router, page]);
  if (user.role !== "admin") return null;
  if (error) return <div className="py-10 text-center"><p role="alert">{error}</p><Button className="mt-3" onClick={() => window.location.reload()}>ลองใหม่</Button></div>;
  if (!summary) return <div className="flex justify-center py-16"><Loader2 className="animate-spin" aria-label="กำลังโหลดผลแบบประเมิน" /></div>;
  const dimensions = [
    { title: "ความพึงพอใจโดยรวม", average: summary.avg_satisfaction_rating, counts: summary.satisfaction_distribution },
    { title: "ความง่ายในการใช้งาน", average: summary.avg_ease_of_use_rating, counts: summary.ease_of_use_distribution },
    { title: "ความแม่นยำตามความคิดเห็นผู้ใช้", average: summary.avg_accuracy_rating, counts: summary.accuracy_distribution },
  ];
  const lowest = dimensions.filter(d => d.average !== null).sort((a, b) => a.average! - b.average!)[0];
  return <div className="mx-auto flex max-w-5xl flex-col gap-6">
    <p className="rounded-xl border border-emerald-100 bg-card p-4 text-sm text-muted-foreground">สถิติและกราฟสรุปเฉพาะผู้ใช้จริง บัญชีที่มีป้าย [ข้อมูลจำลอง] แสดงในรายการเพื่อทดสอบระบบและไม่นำมารวมคะแนน</p>
    <div className="grid gap-4 sm:grid-cols-3">
      {[ ["คำตอบทั้งหมด", `${summary.total_responses} ชุด`], ["ผู้ใช้ที่ตอบแล้ว", `${summary.responded_users} / ${summary.total_users} บัญชี`], ["แนะนำระบบให้ผู้อื่น", summary.would_recommend_rate === null ? "ยังไม่มีคำตอบ" : `${Math.round(summary.would_recommend_rate * 100)}%`] ].map(([label,value]) => <Card key={label}><CardHeader><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{value}</CardContent></Card>)}
    </div>
    {lowest && <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm"><p className="font-semibold">ด้านที่ได้คะแนนเฉลี่ยต่ำสุด: {lowest.title} ({lowest.average!.toFixed(2)} / 5)</p><p className="mt-1 text-muted-foreground">ใช้ความคิดเห็นรายคนประกอบการพิจารณาปรับปรุง คะแนนความแม่นยำนี้เป็นความรู้สึกของผู้ใช้ ไม่ใช่ผลทดสอบโมเดล</p></div>}
    {summary.total_responses === 0 && <p className="rounded-xl bg-muted p-4 text-muted-foreground">ยังไม่มีคำตอบแบบประเมิน กราฟจะแสดงเมื่อมีผู้ใช้ส่งคำตอบ</p>}
    <div className="grid gap-4 lg:grid-cols-3">{dimensions.map(d => <RatingChart key={d.title} {...d} />)}</div>
    <Card><CardHeader><CardTitle className="text-base">การแนะนำระบบให้ผู้อื่น</CardTitle></CardHeader><CardContent>
      <div className="flex h-8 overflow-hidden rounded-lg bg-muted" role="img" aria-label={`แนะนำ ${summary.recommend_count} คน ไม่แนะนำ ${summary.not_recommend_count} คน`}><div className="bg-primary" style={{width: `${summary.total_responses ? summary.recommend_count / summary.total_responses * 100 : 0}%`}} /><div className="bg-warning" style={{width: `${summary.total_responses ? summary.not_recommend_count / summary.total_responses * 100 : 0}%`}} /></div>
      <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm"><span>แนะนำ {summary.recommend_count} คน</span><span>ไม่แนะนำ {summary.not_recommend_count} คน</span></div>
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="size-5" /> คำตอบและความคิดเห็นรายคน ({total})</CardTitle></CardHeader><CardContent className="space-y-4">
      {loadedPage !== page ? <Loader2 className="animate-spin" aria-label="กำลังโหลดคำตอบ" /> : responses.length === 0 ? <p className="text-muted-foreground">ยังไม่มีคำตอบ</p> : responses.map(s => <details key={s.id} className="rounded-xl border p-4"><summary className="cursor-pointer"><span className="font-semibold">{s.userName}</span><span className="ml-2 break-all text-sm text-muted-foreground">{s.userEmail}</span><span className="ml-2 text-sm text-primary">ดูคำตอบ</span></summary><div className="mt-4"><SurveyAnswers survey={s} /><Button asChild variant="outline" className="mt-3"><Link href={`/admin/users/${s.userId}`}>ดูข้อมูลผู้ใช้</Link></Button></div></details>)}
      {total > 10 && <div className="flex items-center justify-between gap-2"><Button variant="outline" disabled={page === 1 || loadedPage !== page} onClick={() => setPage(p => p - 1)}>ก่อนหน้า</Button><span className="text-sm">หน้า {page} / {Math.ceil(total / 10)}</span><Button variant="outline" disabled={page * 10 >= total || loadedPage !== page} onClick={() => setPage(p => p + 1)}>ถัดไป</Button></div>}
    </CardContent></Card>
  </div>;
}
