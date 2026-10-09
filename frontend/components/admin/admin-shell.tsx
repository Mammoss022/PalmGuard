"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ClipboardList, Leaf, ScanLine, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import styles from "./admin.module.css";

const sections = [
  { href: "/admin", label: "ผู้ใช้งาน", title: "จัดการผู้ใช้งาน", description: "ดูข้อมูลบัญชี ประวัติการตรวจวิเคราะห์ และแบบประเมินของผู้ใช้", icon: Users },
  { href: "/admin/diagnoses", label: "ผลการตรวจวิเคราะห์", title: "จัดการผลการตรวจวิเคราะห์", description: "ค้นหา กรอง และตรวจสอบผลการวิเคราะห์ใบปาล์มในระบบ", icon: ScanLine },
  { href: "/admin/surveys", label: "แบบประเมิน", title: "ภาพรวมแบบประเมิน", description: "รับฟังความคิดเห็น เพื่อพัฒนาประสบการณ์การดูแลสวนปาล์ม", icon: ClipboardList },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  useEffect(() => { if (user.role !== "admin") router.replace("/dashboard"); }, [user.role, router]);
  if (user.role !== "admin") return null;
  const detail = pathname.startsWith("/admin/users/");
  const section = sections.find(item => item.href === pathname) ?? sections[0];
  const Icon = detail ? Users : section.icon;
  return <div className={styles.shell}>
    <div className={styles.backdrop} aria-hidden><Leaf /><Leaf /></div>
    <header className={styles.hero}>
      <div className={styles.heroPhoto} aria-hidden />
      <div className={styles.heroContent}>
        <span className={styles.heroMark}><Icon aria-hidden /></span>
        <div><span className={styles.eyebrow}><ShieldCheck aria-hidden />ผู้ดูแลระบบ · PALMGUARD</span><h1>{detail ? "ข้อมูลผู้ใช้งาน" : section.title}</h1><p>{detail ? "ข้อมูลบัญชี ประวัติการวิเคราะห์ และคำตอบแบบประเมินของผู้ใช้" : section.description}</p></div>
      </div>
      <span className={styles.adminBadge}><ShieldCheck aria-hidden />Admin</span>
    </header>
    <nav aria-label="เมนูผู้ดูแลระบบ" className={styles.nav}>{sections.map(item => {
      const active = item.href === pathname || item.href === "/admin" && detail;
      const NavIcon = item.icon;
      return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}><NavIcon aria-hidden />{item.label}</Link>;
    })}</nav>
    {detail && <Link href="/admin" className={styles.backLink}><ArrowLeft aria-hidden />กลับรายชื่อผู้ใช้งาน</Link>}
    <div className={styles.content}>{children}</div>
    <p className={styles.footer}><Leaf aria-hidden />PalmGuard · ดูแลปาล์ม ให้คุณก้าวไกล</p>
  </div>;
}
