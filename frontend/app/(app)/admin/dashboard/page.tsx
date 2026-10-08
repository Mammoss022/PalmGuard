"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, Loader2, RefreshCw, ScanLine, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { getAdminDashboard, type AdminDashboard, type CountItem } from "@/lib/admin-dashboard";
import { formatThaiDateTime } from "@/lib/disease-ui";
import styles from "./dashboard.module.css";

const names: Record<string, string> = { HEALTHY: "ปกติ", BROWN_SPOT: "ใบจุดสีน้ำตาล", WHITE_SCALE: "เพลี้ยหอย" };
function percent(value: number | null) { return value === null ? "—" : `${(value * 100).toFixed(1)}%`; }
function Bars({ items, colors = false }: { items: CountItem[]; colors?: boolean }) {
  const max = Math.max(1, ...items.map(item => item.count));
  return <div className={styles.bars}>{items.map((item, i) => <div key={item.code}><span>{item.label}</span><div className={styles.track}><span style={{ width: `${item.count / max * 100}%`, background: colors ? ["#438d68", "#e4ac47", "#d8766a", "#7d9baa"][i % 4] : undefined }} /></div><strong>{item.count.toLocaleString("th-TH")}</strong></div>)}</div>;
}
function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <div className={styles.metric}><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div>;
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AdminDashboard>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [datasetIndex, setDatasetIndex] = useState(0);
  useEffect(() => {
    if (user.role !== "admin") { router.replace("/dashboard"); return; }
    let cancelled = false;
    getAdminDashboard(days).then(result => { if (!cancelled) { setData(result); setError(""); } })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : "โหลดภาพรวมไม่สำเร็จ"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [days, revision, user.role, router]);
  if (user.role !== "admin") return null;
  const evaluation = data?.model.datasets[datasetIndex] ?? data?.model.datasets[0];
  const chartMax = Math.max(1, ...(data?.ai.daily.map(item => item.count) ?? []));

  return <div className={styles.page}>
    <div className={styles.toolbar}><div className={styles.filters}><label>ช่วงข้อมูล<select value={days} disabled={loading} onChange={event => { setLoading(true); setDays(Number(event.target.value)); }}>{[7, 30, 90, 365].map(n => <option key={n} value={n}>{n} วันล่าสุด</option>)}</select></label><Button variant="outline" size="sm" disabled={loading} onClick={() => { setLoading(true); setRevision(n => n + 1); }}><RefreshCw />รีเฟรช</Button></div></div>
    {loading ? <div className={styles.loading} role="status"><Loader2 className="animate-spin" />กำลังโหลดภาพรวมระบบ…</div> : error ? <div className={styles.error} role="alert">{error}<Button variant="outline" onClick={() => { setLoading(true); setRevision(n => n + 1); }}>ลองใหม่</Button></div> : data && <>
      <p className={styles.range}>ข้อมูล {formatThaiDateTime(data.start_at)} – {formatThaiDateTime(data.end_at)} · จำนวนผู้ใช้ทั้งหมดและผลทดสอบโมเดลไม่ขึ้นกับช่วงวันที่</p>
      <section className={styles.section}><h2><Users />1. ผู้ใช้งาน</h2><div className={styles.userMetrics}><Metric label="ผู้ใช้ทั้งหมด" value={data.users.total} hint={`เกษตรกร ${data.users.farmers} · ผู้ดูแล ${data.users.admins}`} /><Metric label="ผู้ใช้ใหม่" value={data.users.new_users} hint={`ใน ${days} วันล่าสุด`} /><Metric label="Active Users" value={data.users.active_users} hint="ผู้ใช้ไม่ซ้ำที่ส่งภาพหรือแบบประเมินในช่วงนี้" /></div></section>
      <section className={styles.section}><div className={styles.sectionHeading}><h2><ScanLine />2. การวินิจฉัย AI</h2><Link href="/admin/diagnoses">จัดการผลตรวจ <ArrowRight /></Link></div><div className={styles.aiMetrics}><Metric label="การวิเคราะห์ทั้งหมด" value={data.ai.total} /><Metric label="สำเร็จ" value={data.ai.completed} /><Metric label="วิเคราะห์ไม่สำเร็จ" value={data.ai.failed} hint={`อัตราไม่สำเร็จ ${data.ai.total ? percent(data.ai.failed / data.ai.total) : "—"}`} /><Metric label="Confidence เฉลี่ย" value={percent(data.ai.mean_confidence)} hint={`Confidence ต่ำกว่า 75%: ${data.ai.low_confidence} รายการ`} /></div><div className={styles.chartColumns}><div><h3>ประเภทผลตรวจที่พบ</h3><Bars items={data.ai.diseases} colors /></div><div><h3>จำนวนการวิเคราะห์รายวัน</h3><div className={styles.dailyChart} data-dense={data.ai.daily.length > 90 || undefined} role="img" aria-label={`กราฟการวิเคราะห์ ${days} วัน รวม ${data.ai.total} รายการ`}>{data.ai.daily.map(item => <span key={item.code} style={{ height: `${Math.max(2, item.count / chartMax * 100)}%`, opacity: item.count ? 1 : .2 }} title={`${item.code}: ${item.count} รายการ`} />)}</div><div className={styles.chartAxis}><span>{data.ai.daily[0]?.label}</span><span>{data.ai.daily.at(-1)?.label}</span></div><details className={styles.chartDetails}><summary>ดูข้อมูลรายวัน</summary><div>{data.ai.daily.map(item => <p key={item.code}>{item.code}<strong>{item.count}</strong></p>)}</div></details></div></div><p className={styles.note}>กำลังวิเคราะห์ {data.ai.processing} รายการ · ผู้ดูแลแก้ไข {data.ai.admin_corrected} รายการ (ไม่รวมในค่า Confidence เฉลี่ย)</p></section>
      <section className={styles.section}><div className={styles.sectionHeading}><h2><Activity />3. ประสิทธิภาพโมเดล</h2><span className={styles.version}>{data.model.model_version ?? "ยังไม่ระบุเวอร์ชัน"}</span></div>{data.model.available && evaluation ? <>
        <div className={styles.modelToolbar}><label>ชุดทดสอบ<select value={datasetIndex} onChange={event => setDatasetIndex(Number(event.target.value))}>{data.model.datasets.map((set, i) => <option key={set.name} value={i}>{set.name} · {set.support} ภาพ</option>)}</select></label><span>แหล่งข้อมูล: {data.model.source}</span></div>
        <div className={styles.aiMetrics}>{(["accuracy", "precision", "recall", "f1"] as const).map(key => <Metric key={key} label={key === "f1" ? "F1-score" : key[0].toUpperCase() + key.slice(1)} value={percent(evaluation[key])} hint={key === "accuracy" ? "จากชุดทดสอบ" : "Macro average"} />)}</div>
        <div className={styles.tableWrap}><table className={styles.modelTable}><thead><tr><th>ประเภทโรค</th><th>Precision</th><th>Recall</th><th>F1-score</th><th>จำนวนภาพ</th></tr></thead><tbody>{evaluation.per_class.map(row => <tr key={row.code}><td>{names[row.code] ?? row.code}</td><td>{percent(row.precision)}</td><td>{percent(row.recall)}</td><td>{percent(row.f1)}</td><td>{row.support}</td></tr>)}</tbody></table></div><p className={styles.note}>ค่าจากรายงานประเมินโมเดลที่ตั้งค่าใช้งานอยู่ แยกจาก Confidence ของภาพที่ผู้ใช้อัปโหลดและคะแนนความพึงพอใจ ชุดทดสอบเดิมกับชุดใหม่แสดงแยกกัน</p>
      </> : <p className={styles.empty}>{data.model.reason ?? "ยังไม่มีรายงานทดสอบโมเดล"}</p>}</section>
    </>}
  </div>;
}
