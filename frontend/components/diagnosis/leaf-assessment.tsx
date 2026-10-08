"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ClipboardList, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

interface Assessment { expected_class_code: string; severity_score: number; symptoms: string[]; risk_level: string }
const classes = [["HEALTHY", "ปกติ"], ["BROWN_SPOT", "ใบจุดสีน้ำตาล"], ["WHITE_SCALE", "เพลี้ยหอย"]];
const symptoms = [["brown_spots", "จุดสีน้ำตาล"], ["white_scales", "คราบขาว / เพลี้ยหอย"], ["yellowing", "ใบเหลือง"], ["drying", "ใบแห้ง"], ["wilting", "ใบเหี่ยว"]];

export function LeafAssessmentForm({ diagnosisId, canSubmit }: { diagnosisId: string; canSubmit: boolean }) {
  const [answer, setAnswer] = useState<Assessment | null>();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [expected, setExpected] = useState("HEALTHY");
  const [severity, setSeverity] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let cancelled = false;
    apiFetch<Assessment | null>(`/diagnoses/${diagnosisId}/assessment`).then(value => {
      if (!cancelled) { setAnswer(value); setError(""); }
    }).catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : "โหลดแบบประเมินไม่สำเร็จ"); });
    return () => { cancelled = true; };
  }, [diagnosisId, retry]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving || !canSubmit) return;
    setSaving(true);
    try {
      setAnswer(await apiFetch<Assessment>(`/diagnoses/${diagnosisId}/assessment`, { method: "POST", body: { expected_class_code: expected, severity_score: expected === "HEALTHY" ? 1 : severity, symptoms: expected === "HEALTHY" ? [] : selected } }));
      toast.success("บันทึกแบบประเมินอาการแล้ว");
    } catch (err) { toast.error(err instanceof Error ? err.message : "บันทึกแบบประเมินไม่สำเร็จ"); }
    finally { setSaving(false); }
  }
  return <section className="rounded-2xl border border-emerald-100 bg-card p-5">
    <h2 className="flex items-center gap-2 font-bold text-primary"><ClipboardList className="size-5" />แบบประเมินอาการใบปาล์ม</h2>
    <p className="mt-2 text-sm text-muted-foreground">บันทึกสิ่งที่คุณสังเกตจากใบปาล์มภาพนี้ เพื่อเปรียบเทียบกับผล AI แยกจากแบบประเมินความพึงพอใจ</p>
    {error ? <p role="alert" className="mt-3 text-sm">{error} <Button variant="outline" size="sm" onClick={() => setRetry(value => value + 1)}>ลองใหม่</Button></p> : answer === undefined ? <p role="status" className="mt-3 text-sm">กำลังโหลดแบบประเมิน…</p> : answer ? <div className="mt-4 flex items-start gap-2 rounded-xl bg-accent p-4 text-sm"><CheckCircle2 className="size-5 shrink-0 text-primary" /><div><p>ส่งแบบประเมินแล้ว · {classes.find(([code]) => code === answer.expected_class_code)?.[1]}</p><p className="mt-1 text-muted-foreground">ความรุนแรง {answer.severity_score}/5 · ความเสี่ยง{answer.risk_level === "low" ? "ต่ำ" : answer.risk_level === "medium" ? "ปานกลาง" : "สูง"}</p>{answer.symptoms.length > 0 && <p className="mt-1 text-muted-foreground">{answer.symptoms.map(code => symptoms.find(([key]) => key === code)?.[1]).join(" · ")}</p>}</div></div> : !canSubmit ? <p className="mt-3 text-sm text-muted-foreground">ยังไม่มีแบบประเมินอาการสำหรับรายการนี้</p> : <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm font-medium">จากสิ่งที่สังเกต คุณคิดว่าใบปาล์มเป็นอย่างไร?
        <select disabled={saving} value={expected} onChange={event => { setExpected(event.target.value); setSelected([]); setSeverity(1); }} className="rounded-lg border bg-background p-3">{classes.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select>
      </label>
      {expected !== "HEALTHY" && <><fieldset disabled={saving}><legend className="mb-2 text-sm font-medium">อาการที่พบ (เลือกได้หลายข้อ)</legend><div className="flex flex-wrap gap-x-5 gap-y-3">{symptoms.map(([code, label]) => <label key={code} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selected.includes(code)} onChange={event => setSelected(previous => event.target.checked ? [...previous, code] : previous.filter(value => value !== code))} />{label}</label>)}</div></fieldset><label className="flex flex-col gap-2 text-sm font-medium">ความรุนแรงที่คุณสังเกต (1–5)<select value={severity} disabled={saving} onChange={event => setSeverity(Number(event.target.value))} className="rounded-lg border bg-background p-3">{["1 — เล็กน้อย", "2 — ค่อนข้างเล็กน้อย", "3 — ปานกลาง", "4 — รุนแรง", "5 — รุนแรงมาก"].map((label, i) => <option key={i} value={i + 1}>{label}</option>)}</select></label></>}
      <p className="text-xs text-muted-foreground">ความเสี่ยงจากคะแนนที่ผู้ใช้ระบุ: 1–2 ต่ำ, 3 ปานกลาง, 4–5 สูง ส่งได้ครั้งเดียวต่อรายการ ผลนี้เป็นการสังเกตของผู้ใช้</p>
      <Button type="submit" disabled={saving} className="rounded-full">{saving ? "กำลังบันทึก…" : "ส่งแบบประเมินอาการ"}</Button>
    </form>}
  </section>;
}
