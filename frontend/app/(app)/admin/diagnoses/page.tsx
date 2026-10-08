"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { Eye, Pencil, Trash2 } from "lucide-react";
import styles from "@/components/admin/admin.module.css";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { listAdminDiagnoses, updateAdminDiagnosis, deleteAdminDiagnosis, type AdminDiagnosis } from "@/lib/admin";
import { formatThaiDateTime } from "@/lib/disease-ui";

const classes = [["HEALTHY", "ใบปาล์มปกติ"], ["BROWN_SPOT", "โรคใบจุดสีน้ำตาล"], ["WHITE_SCALE", "เพลี้ยหอยขาว"], ["NON_PALM", "ไม่ใช่ใบปาล์ม"]];
const statuses = { processing: "กำลังวิเคราะห์", completed: "สำเร็จ", failed: "ไม่สำเร็จ" };
const fieldStyle = "w-full rounded-lg border bg-background px-3 py-2";

export default function AdminDiagnosesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [filters, setFilters] = useState({ q: "", status: "", classCode: "", page: 1 });
  const [query, setQuery] = useState("");
  const [data, setData] = useState<{ items: AdminDiagnosis[]; total: number }>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<AdminDiagnosis>();
  const [deleting, setDeleting] = useState<AdminDiagnosis>();
  const [busy, setBusy] = useState(false);
  const [editStatus, setEditStatus] = useState<"completed" | "failed">("completed");
  const [classCode, setClassCode] = useState("HEALTHY");
  const [confidence, setConfidence] = useState("0");

  useEffect(() => {
    if (user.role !== "admin") { router.replace("/dashboard"); return; }
    let cancelled = false;
    listAdminDiagnoses(filters).then(result => {
      if (!cancelled) { setData(result); setError(""); }
    }).catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filters, revision, user.role, router]);

  function changeFilters(next: typeof filters) { setLoading(true); setFilters(next); }
  function openEdit(item: AdminDiagnosis) {
    setEditing(item); setEditStatus(item.status === "failed" ? "failed" : "completed");
    setClassCode(item.result?.classCode ?? "HEALTHY");
    setConfidence(String((item.result?.confidenceScore ?? 0) * 100));
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing || busy) return;
    setBusy(true);
    try {
      await updateAdminDiagnosis(editing.id, editStatus === "failed" ? { status: "failed" } : { status: "completed", class_code: classCode, confidence_score: Number(confidence) / 100 });
      setEditing(undefined); setLoading(true); setRevision(value => value + 1); toast.success("บันทึกผลการตรวจแล้ว");
    } catch (err) { toast.error(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ"); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!deleting || busy) return;
    setBusy(true);
    try {
      await deleteAdminDiagnosis(deleting.id); setDeleting(undefined); setLoading(true);
      setFilters(previous => ({ ...previous, page: 1 })); setRevision(value => value + 1); toast.success("ลบผลการตรวจแล้ว");
    } catch (err) { toast.error(err instanceof Error ? err.message : "ลบไม่สำเร็จ"); }
    finally { setBusy(false); }
  }
  if (user.role !== "admin") return null;

  return <div className="mx-auto flex max-w-6xl flex-col gap-5">
    <form onSubmit={event => { event.preventDefault(); changeFilters({ ...filters, q: query.trim(), page: 1 }); }} className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${styles.diagnosisForm}`}>
      <label className="text-sm">ค้นหาชื่อ อีเมล หรือรหัสรายการ<input value={query} onChange={event => setQuery(event.target.value)} maxLength={200} className={fieldStyle} placeholder="คำค้นหา" /></label>
      <label className="text-sm">สถานะ<select className={fieldStyle} value={filters.status} onChange={event => changeFilters({ ...filters, status: event.target.value, page: 1 })}><option value="">ทั้งหมด</option>{Object.entries(statuses).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
      <label className="text-sm">ประเภทผลตรวจ<select className={fieldStyle} value={filters.classCode} onChange={event => changeFilters({ ...filters, classCode: event.target.value, page: 1 })}><option value="">ทั้งหมด</option>{classes.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
      <div className="flex items-end gap-2"><Button type="submit">ค้นหา</Button><Button type="button" variant="outline" onClick={() => { setQuery(""); changeFilters({ q: "", status: "", classCode: "", page: 1 }); }}>ล้างตัวกรอง</Button></div>
    </form>
    {error ? <div role="alert" className="text-destructive">{error} <Button variant="outline" onClick={() => { setLoading(true); setRevision(value => value + 1); }}>ลองใหม่</Button></div> : loading ? <p role="status">กำลังโหลดข้อมูล…</p> : <>
      <p className="text-sm text-muted-foreground">พบ {data?.total ?? 0} รายการ</p>
      {!data?.items.length && <p className="rounded-xl border p-6 text-center">ไม่พบผลการตรวจที่ตรงกับเงื่อนไข</p>}
      <div className="grid gap-3">{data?.items.map(item => <article key={item.id} className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.imageUrl} alt={item.result?.nameTh ?? statuses[item.status]} className={styles.diagnosisImage} />
        <div className="min-w-0 flex-1"><p className="font-semibold">{item.userName}</p><p className="break-all text-sm text-muted-foreground">{item.userEmail}</p><p className="mt-2">{item.result?.nameTh ?? statuses[item.status]}{item.result && ` • ${(item.result.confidenceScore * 100).toFixed(2)}%`}</p><p className="text-sm text-muted-foreground">{statuses[item.status]} • {formatThaiDateTime(item.createdAt)}</p><p className="break-all text-xs text-muted-foreground">{item.id}</p></div>
        <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href={`/diagnose/${item.id}/result`}><Eye />ดูรายละเอียด</Link></Button><Button variant="outline" disabled={item.status === "processing" || busy} onClick={() => openEdit(item)}><Pencil />แก้ไข</Button><Button variant="destructive" disabled={item.status === "processing" || busy} onClick={() => setDeleting(item)}><Trash2 />ลบ</Button></div>
      </article>)}</div>
      <div className="flex items-center justify-between"><Button variant="outline" disabled={filters.page === 1} onClick={() => changeFilters({ ...filters, page: filters.page - 1 })}>ก่อนหน้า</Button><span>หน้า {filters.page} / {Math.max(1, Math.ceil((data?.total ?? 0) / 20))}</span><Button variant="outline" disabled={filters.page * 20 >= (data?.total ?? 0)} onClick={() => changeFilters({ ...filters, page: filters.page + 1 })}>ถัดไป</Button></div>
    </>}
    <Dialog.Root open={!!editing} onOpenChange={open => { if (!open && !busy) setEditing(undefined); }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-emerald-100 bg-card p-6">
      <Dialog.Title className="text-lg font-bold">แก้ไขผลการตรวจ</Dialog.Title><Dialog.Description className="mb-4 text-sm text-muted-foreground">ตรวจสอบประเภทโรคและค่าความมั่นใจก่อนบันทึก การแก้ไขนี้จะแสดงในประวัติของผู้ใช้ด้วย</Dialog.Description>
      <form onSubmit={save} className="flex flex-col gap-3"><label>สถานะ<select disabled={busy} className={fieldStyle} value={editStatus} onChange={event => setEditStatus(event.target.value as "completed" | "failed")}><option value="completed">สำเร็จ</option><option value="failed">ไม่สำเร็จ</option></select></label>
        {editStatus === "completed" && <><label>ประเภทผลตรวจ<select disabled={busy} className={fieldStyle} value={classCode} onChange={event => setClassCode(event.target.value)}>{classes.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label><label>ความมั่นใจ (%)<input disabled={busy} className={fieldStyle} type="number" required min={0} max={100} step="0.01" value={confidence} onChange={event => setConfidence(event.target.value)} /></label></>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(undefined)}>ยกเลิก</Button><Button disabled={busy} type="submit">{busy ? "กำลังบันทึก…" : "บันทึก"}</Button></div>
      </form></Dialog.Content></Dialog.Portal></Dialog.Root>
    <Dialog.Root open={!!deleting} onOpenChange={open => { if (!open && !busy) setDeleting(undefined); }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-emerald-100 bg-card p-6"><Dialog.Title className="text-lg font-bold">ยืนยันการลบผลการตรวจ</Dialog.Title><Dialog.Description className="my-4 break-all">ลบรายการ {deleting?.id} ของ {deleting?.userName} ออกจากระบบและประวัติผู้ใช้? การลบไม่สามารถย้อนกลับได้</Dialog.Description><div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setDeleting(undefined)}>ยกเลิก</Button><Button variant="destructive" disabled={busy} onClick={remove}>{busy ? "กำลังลบ…" : "ยืนยันลบ"}</Button></div></Dialog.Content></Dialog.Portal></Dialog.Root>
  </div>;
}
