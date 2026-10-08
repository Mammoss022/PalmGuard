"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Bug, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ChevronsUpDown, CircleDot, Eye, ImageIcon, Inbox, Leaf, List, Loader2, TriangleAlert, type LucideIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listDiagnoses } from "@/lib/diagnoses";
import { formatConfidence, formatThaiDateTime } from "@/lib/disease-ui";
import type { Diagnosis, DiseaseCode } from "@/lib/types";
import styles from "./history.module.css";

const PAGE_SIZE = 5;
type Filter = DiseaseCode | "ALL" | "FAILED";
type SortKey = "date" | "result" | "confidence";
const descriptions: Partial<Record<DiseaseCode, string>> = {
  HEALTHY: "ใบปาล์มมีลักษณะปกติ",
  BROWN_SPOT: "พบลักษณะจุดสีน้ำตาลบนใบปาล์ม",
  WHITE_SCALE: "พบลักษณะเพลี้ยหอยบนใบปาล์ม",
  NON_PALM: "ภาพไม่อยู่ในกลุ่มใบปาล์มที่ระบบรองรับ",
};

function resultTitle(d: Diagnosis) {
  return d.result?.nameTh ?? (d.status === "failed" ? "วิเคราะห์ไม่สำเร็จ" : "กำลังวิเคราะห์");
}
function description(d: Diagnosis) {
  return d.result ? descriptions[d.result.classCode] : d.status === "failed" ? "ระบบไม่สามารถวิเคราะห์ภาพนี้ได้" : "ระบบกำลังประมวลผลภาพ";
}
function thaiDate(iso: string) {
  const date = new Date(iso);
  return {
    date: new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" }).format(date),
    time: new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(date),
  };
}
function StatusBadge({ diagnosis: d }: { diagnosis: Diagnosis }) {
  if (!d.result) return <span className={`${styles.status} ${d.status === "failed" ? styles.failed : styles.processing}`}>
    {d.status === "failed" ? <TriangleAlert /> : <Loader2 className="animate-spin" />}{d.status === "failed" ? "ไม่สำเร็จ" : "กำลังวิเคราะห์"}
  </span>;
  const code = d.result.classCode;
  return <span className={`${styles.status} ${code === "HEALTHY" ? styles.healthy : code === "BROWN_SPOT" ? styles.brown : code === "WHITE_SCALE" ? styles.white : styles.processing}`}>
    {code === "HEALTHY" ? <CheckCircle2 /> : <TriangleAlert />}มั่นใจ {formatConfidence(d.result.confidenceScore)}
  </span>;
}

export default function HistoryPage() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [diagnoses, setDiagnoses] = useState<Diagnosis[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: SortKey; ascending: boolean }>({ key: "date", ascending: false });

  useEffect(() => {
    let cancelled = false;
    async function loadDiagnoses() {
      const first = await listDiagnoses({ pageSize: 100 });
      const items = [...first.items];
      for (let page = 2; (page - 1) * 100 < first.total; page++) {
        if (cancelled) return null;
        const next = await listDiagnoses({ page, pageSize: 100 });
        items.push(...next.items);
      }
      return items;
    }
    loadDiagnoses().then(res => { if (!cancelled && res) setDiagnoses(res); })
      .catch(() => { if (!cancelled) { setLoadError(true); setDiagnoses([]); } });
    return () => { cancelled = true; };
  }, []);

  const filters: { value: Filter; label: string; icon: LucideIcon }[] = useMemo(() => {
    const count = (code: DiseaseCode) => (diagnoses ?? []).filter(d => d.result?.classCode === code).length;
    return [
      { value: "ALL", label: `ทั้งหมด (${diagnoses?.length ?? 0})`, icon: List },
      { value: "HEALTHY", label: `ปกติ (${count("HEALTHY")})`, icon: Leaf },
      { value: "BROWN_SPOT", label: `ใบจุด (${count("BROWN_SPOT")})`, icon: CircleDot },
      { value: "WHITE_SCALE", label: `เพลี้ยหอย (${count("WHITE_SCALE")})`, icon: Bug },
      { value: "FAILED", label: `วิเคราะห์ไม่สำเร็จ (${(diagnoses ?? []).filter(d => d.status === "failed").length})`, icon: TriangleAlert },
    ];
  }, [diagnoses]);

  const filtered = useMemo(() => {
    const items = (diagnoses ?? []).filter(d => filter === "ALL" || (filter === "FAILED" ? d.status === "failed" : d.result?.classCode === filter));
    return items.sort((a, b) => {
      const difference = sort.key === "date" ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : sort.key === "confidence" ? (a.result?.confidenceScore ?? -1) - (b.result?.confidenceScore ?? -1)
          : resultTitle(a).localeCompare(resultTitle(b), "th");
      return (sort.ascending ? 1 : -1) * difference;
    });
  }, [diagnoses, filter, sort]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const visibleDiagnoses = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const firstPageNumber = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, i) => firstPageNumber + i);

  function changeSort(key: SortKey) {
    setSort(previous => ({ key, ascending: previous.key === key ? !previous.ascending : true }));
    setPage(1);
  }
  function sortIcon(key: SortKey) {
    const Icon = sort.key === key ? sort.ascending ? ArrowUp : ArrowDown : ChevronsUpDown;
    return <Icon className={styles.sortIcon} aria-hidden />;
  }
  function ariaSort(key: SortKey): "ascending" | "descending" | "none" {
    return sort.key === key ? sort.ascending ? "ascending" : "descending" : "none";
  }

  if (diagnoses === null) return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="size-6 animate-spin text-primary" aria-label="กำลังโหลดประวัติ" /></div>;

  return <div className={styles.page}>
    <div className={styles.backdrop} aria-hidden>
      <svg className={styles.palm} viewBox="0 0 400 300" fill="none"><path d="M405 20C260 12 232 134 188 288" stroke="#75bc91" strokeWidth="5" />
        {Array.from({length: 9}, (_, i) => <g key={i} transform={`translate(${330 - i * 14} ${28 + i * 26}) rotate(${i * 3})`}><path d="M0 0C-35-50-93-49-158-17C-91-35-35-27 0 0Z" fill="#86cda0" /><path d="M0 0C45-15 83 13 103 58C64 28 32 8 0 0Z" fill="#6bb888" /></g>)}
      </svg>
    </div>
    <div className={styles.intro}>
      <span className={styles.introIcon}><Leaf className="size-10" aria-hidden /></span>
      <div><span className={styles.eyebrow}>ประวัติ</span><h1 className={styles.title}>ประวัติการวินิจฉัย</h1><p className={styles.subtitle}>รายการผลวิเคราะห์ย้อนหลังทั้งหมด {diagnoses.length} รายการ</p></div>
    </div>

    <section className={styles.panel} aria-label="รายการประวัติการวินิจฉัย">
      <Tabs value={filter} onValueChange={value => { setFilter(value as Filter); setPage(1); }}>
        <TabsList className={styles.tabList} aria-label="กรองประวัติตามผลวินิจฉัย">
          {filters.map(({ value, label, icon: Icon }) => <TabsTrigger key={value} value={value} className={styles.tab}><Icon aria-hidden />{label}</TabsTrigger>)}
        </TabsList>
      </Tabs>
      {loadError ? <div className={styles.empty}><p role="alert">โหลดประวัติไม่สำเร็จ กรุณาลองใหม่</p><button className={styles.detailLink} onClick={() => window.location.reload()}>ลองใหม่</button></div>
        : filtered.length === 0 ? <div className={styles.empty}><Inbox className="size-8" aria-hidden /><p>ไม่พบรายการในหมวดนี้</p></div>
          : <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <caption className="sr-only">ประวัติการวินิจฉัย หน้าละ 5 รายการ</caption>
                <thead><tr>
                  <th scope="col" aria-sort={ariaSort("date")} style={{width:"22%"}}><button className={styles.sortButton} onClick={() => changeSort("date")}><CalendarDays className="size-4" aria-hidden />วันที่วิเคราะห์{sortIcon("date")}</button></th>
                  <th scope="col" aria-sort={ariaSort("result")} style={{width:"38%"}}><button className={styles.sortButton} onClick={() => changeSort("result")}><ImageIcon className="size-5" aria-hidden />ภาพตัวอย่าง{sortIcon("result")}</button></th>
                  <th scope="col" aria-sort={ariaSort("confidence")} style={{width:"23%"}}><button className={styles.sortButton} onClick={() => changeSort("confidence")} title="เรียงตามความเชื่อมั่น">สถานะ{sortIcon("confidence")}</button></th>
                  <th scope="col">จัดการ</th><th scope="col"><span className="sr-only">เปิดรายละเอียด</span></th>
                </tr></thead>
                <tbody>{visibleDiagnoses.map(d => {
                  const date = thaiDate(d.createdAt);
                  return <tr key={d.id}>
                    <td><div className={styles.dateCell}><CalendarDays className={styles.dateIcon} aria-hidden /><time dateTime={d.createdAt}><span>{date.date}</span><span className={`${styles.time} block`}>{date.time} น.</span></time></div></td>
                    <td><div className={styles.sample}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className={styles.thumbnail} src={d.imageUrl} alt={resultTitle(d)} />
                      <div><p className={styles.resultTitle}>{resultTitle(d)}</p><p className={styles.description}>{description(d)}</p></div>
                    </div></td>
                    <td><StatusBadge diagnosis={d} /></td>
                    <td><Link href={`/diagnose/${d.id}/result`} className={styles.detailLink}><Eye aria-hidden />ดูรายละเอียด</Link></td>
                    <td><ChevronRight className={`${styles.rowArrow} size-4`} aria-hidden /></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
            <div className={styles.mobileList}>{visibleDiagnoses.map(d => <article key={d.id} className={styles.mobileRow}>
              <div className={styles.mobileSample}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.imageUrl} alt={resultTitle(d)} className={styles.thumbnail} />
                <div><p className={styles.resultTitle}>{resultTitle(d)}</p><p className={styles.description}>{description(d)}</p><time className={styles.mobileDate} dateTime={d.createdAt}>{formatThaiDateTime(d.createdAt)}</time></div>
              </div>
              <div className={styles.mobileActions}><StatusBadge diagnosis={d} /><Link href={`/diagnose/${d.id}/result`} className={styles.detailLink}><Eye aria-hidden />ดูรายละเอียด</Link></div>
            </article>)}</div>
            <nav className={styles.footer} aria-label="เปลี่ยนหน้าประวัติ">
              <p className={styles.pageInfo} aria-live="polite">หน้า {currentPage} จาก {totalPages} <span className="mx-2">·</span> ทั้งหมด {filtered.length} รายการ</p>
              <div className={styles.pageControls}>
                <button className={styles.pageButton} disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft aria-hidden />ก่อนหน้า</button>
                {pageNumbers.map(number => <button key={number} className={styles.pageButton} aria-label={`ไปหน้า ${number}`} aria-current={number === currentPage ? "page" : undefined} onClick={() => setPage(number)}>{number}</button>)}
                <button className={`${styles.pageButton} ${styles.next}`} disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>ถัดไป<ChevronRight aria-hidden /></button>
              </div>
            </nav>
          </>}
    </section>
  </div>;
}
