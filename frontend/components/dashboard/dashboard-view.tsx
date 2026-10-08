"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Eye, Leaf, Lightbulb, Loader2, ScanLine, Sprout, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sparkline } from "@/components/dashboard/sparkline";
import { diseaseVisual, formatConfidence } from "@/lib/disease-ui";
import type { AppUser, Diagnosis } from "@/lib/types";
import styles from "./dashboard.module.css";

interface Stat {
  key: string;
  label: string;
  count: number;
  icon: LucideIcon;
  badgeClass: string;
  lineClass: string;
  sparkline: number[];
}

const photoTips = [
  "ถ่ายในที่มีแสงสว่างเพียงพอ ไม่ย้อนแสง",
  "เห็นใบชัดเจน ทั้งใบ ไม่เบลอ",
  "ถ่ายให้เห็นพื้นที่ที่สงสัยหรือมีอาการผิดปกติ",
  "ควรถ่ายจากหลายมุม เพื่อความแม่นยำในการวิเคราะห์",
];

function dateParts(value: string) {
  const date = new Date(value);
  return [new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" }).format(date),
    new Intl.DateTimeFormat("th-TH", { timeStyle: "short", timeZone: "Asia/Bangkok" }).format(date)];
}

export function DashboardView({ user, diagnoses, stats, uploading, isDragging, onChooseImage, onDropImage, onDragging, error, onRetry }: {
  user: AppUser;
  diagnoses: Diagnosis[];
  stats: Stat[];
  uploading: boolean;
  isDragging: boolean;
  onChooseImage: () => void;
  onDropImage: (file: File | undefined) => void;
  onDragging: (value: boolean) => void;
  error: string;
  onRetry: () => void;
}) {
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const pages = Math.max(1, Math.ceil(diagnoses.length / pageSize));
  const currentPage = Math.min(page, pages);
  const recent = diagnoses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return <div className={styles.page}>
    <div className={styles.backdrop} aria-hidden><Leaf /><Leaf /></div>
    <section className={styles.hero}>
      <div className={styles.heroPhoto} aria-hidden />
      <Leaf className={styles.heroLeaf} aria-hidden />
      <div className={styles.greeting}>
        <span className={styles.report}>รายงาน</span>
        <h1>สวัสดี, {user.fullName} <Sprout aria-hidden /></h1>
        <p>ภาพรวมการวินิจฉัยโรคใบปาล์มของคุณ</p>
        <span className={styles.tagline}><span><Sprout aria-hidden /></span>ดูแลสวนปาล์มของคุณได้ง่ายขึ้น ด้วยเทคโนโลยี AI</span>
      </div>
      <div className={styles.heroAction} data-dragging={isDragging || undefined}
        onDragOver={event => { event.preventDefault(); if (!uploading) onDragging(true); }}
        onDragLeave={() => onDragging(false)}
        onDrop={event => { event.preventDefault(); onDragging(false); onDropImage(event.dataTransfer.files?.[0]); }}>
        <div className={styles.actionHeading}><span className={styles.actionIcon}><Sprout aria-hidden /></span><div><h2>พร้อมตรวจสอบใบปาล์มวันนี้หรือยัง?</h2><p>อัปโหลดภาพหรือใช้กล้อง เพื่อวิเคราะห์โรคพืชได้ทันที</p></div></div>
        <Button className={styles.startButton} disabled={uploading} onClick={onChooseImage}>{uploading ? <Loader2 className="animate-spin" /> : <ScanLine />}{uploading ? "กำลังวิเคราะห์…" : "เริ่มวินิจฉัย"}<ArrowRight /></Button>
      </div>
    </section>

    {error ? <div role="alert" className={styles.error}>{error}<Button variant="outline" onClick={onRetry}>ลองโหลดใหม่</Button></div> : <section aria-label="สถิติการวินิจฉัย" className={styles.stats}>
      {stats.map(({ key, label, count, icon: Icon, sparkline, badgeClass, lineClass }) => {
        const change = sparkline.slice(7).reduce((sum, n) => sum + n, 0) - sparkline.slice(0, 7).reduce((sum, n) => sum + n, 0);
        const StatIcon = key === "total" ? Leaf : Icon;
        return <article key={key} className={styles.statCard} data-kind={key}>
          <Leaf className={styles.statLeaf} aria-hidden />
          <span className={`${styles.statIcon} ${badgeClass}`}><StatIcon aria-hidden /></span>
          <h2>{label}</h2><p className={styles.statNumber}>{count}</p>
          <div className={styles.trend}><span className={change < 0 ? styles.decrease : styles.increase}>{change >= 0 ? "+" : ""}{change}</span> จากสัปดาห์ที่แล้ว</div>
          <Sparkline values={sparkline} className={`${styles.sparkline} ${lineClass}`} />
        </article>;
      })}
    </section>}

    <div className={styles.columns}>
      <section className={styles.historyPanel}>
        <div className={styles.panelHeading}><span className={styles.headingLeaf}><Leaf aria-hidden /></span><div><h2>รายการล่าสุด</h2><p>ผลการวินิจฉัยใบปาล์มล่าสุด</p></div><Button asChild variant="outline" className={styles.pillButton}><Link href="/history">ดูทั้งหมด <ArrowRight /></Link></Button></div>
        {error ? <p className={styles.empty}>ไม่สามารถโหลดประวัติได้ กรุณาลองใหม่</p> : !recent.length ? <div className={styles.empty}><Leaf aria-hidden /><p>ยังไม่มีรายการวินิจฉัย</p><Button asChild className="mt-4"><Link href="/diagnose">เริ่มวินิจฉัยใบปาล์ม</Link></Button></div> : <>
          <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>วันที่/เวลา</th><th>ภาพตัวอย่าง</th><th>ผลการวินิจฉัย</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>
            {recent.map(item => {
              const visual = item.result ? diseaseVisual[item.result.classCode] : null;
              const Icon = visual?.icon;
              const title = item.result?.nameTh ?? (item.status === "failed" ? "วิเคราะห์ไม่ได้" : "กำลังวิเคราะห์");
              const [date, time] = dateParts(item.createdAt);
              const confidence = item.result?.confidenceScore;
              return <tr key={item.id}><td><time dateTime={item.createdAt}>{date}<span>{time}</span></time></td><td>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.imageUrl} alt={title} className={styles.thumbnail} />
              </td><td className={styles.resultTitle}>{title}</td><td>{visual && Icon ? <span data-code={item.result?.classCode} className={`${styles.confidence} ${visual.badgeClass}`}><Icon aria-hidden />{confidence !== undefined && (confidence >= .9 ? "สูง " : confidence >= .75 ? "ปานกลาง " : "ต่ำ ")}{formatConfidence(confidence ?? null)}</span> : <span className={styles.dash}>-</span>}</td><td><Button asChild variant="outline" size="sm" className={styles.detailButton}><Link href={`/diagnose/${item.id}/result`}><Eye />ดูรายละเอียด</Link></Button></td></tr>;
            })}
          </tbody></table></div>
          <nav aria-label="หน้าผลการวินิจฉัย" className={styles.pagination}><p>หน้า {currentPage} จาก {pages} · ทั้งหมด {diagnoses.length} รายการ</p><div><Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>ก่อนหน้า</Button>{Array.from({ length: Math.min(5, pages) }, (_, i) => Math.max(1, Math.min(currentPage - 2, pages - 4)) + i).map(n => <Button key={n} size="sm" variant={n === currentPage ? "default" : "outline"} aria-current={n === currentPage ? "page" : undefined} onClick={() => setPage(n)}>{n}</Button>)}<Button size="sm" variant="outline" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>ถัดไป</Button></div></nav>
        </>}
      </section>

      <aside className={styles.sidebar}>
        <section className={styles.tipsPanel}><Leaf className={styles.tipLeaf} aria-hidden /><h2><span><Lightbulb aria-hidden /></span>เคล็ดลับการถ่ายภาพ</h2><ul>{photoTips.map(tip => <li key={tip}><span><Check aria-hidden /></span>{tip}</li>)}</ul></section>
        <section className={styles.promo}><div className={styles.promoContent}><span><Sprout aria-hidden />ดูแลสวนปาล์มของคุณ</span><h2>ให้ปลอดโรค เพิ่มผลผลิต</h2><p>PalmGuard ผู้ช่วยเกษตรกรยุคใหม่<br />วิเคราะห์แม่นยำ ด้วย AI</p><Button asChild className={styles.promoButton}><Link href="/diagnose">เริ่มวินิจฉัยตอนนี้ <ArrowRight /></Link></Button></div><Leaf aria-hidden className={styles.promoLeaf} /></section>
        <p className={styles.motto}>ปาล์มแข็งแรง สวนยั่งยืน <Leaf aria-hidden /></p>
        <div className={styles.utilityLinks}><Link href="/survey">แบบประเมินความพึงพอใจ</Link>{user.role === "admin" && <Link href="/admin">จัดการระบบ</Link>}</div>
      </aside>
    </div>
  </div>;
}
