import Image from "next/image";
import Link from "next/link";
import {
  Leaf,
  ScanLine,
  History,
  ShieldAlert,
  Camera,
  Sparkles,
  ClipboardList,
  ArrowRight,
  Clock,
  Layers,
  Gift,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { diseaseClasses } from "@/lib/disease-catalog";
import { diseaseVisual } from "@/lib/disease-ui";

const steps = [
  { icon: Camera, title: "ถ่ายภาพ/อัปโหลด", desc: "ถ่ายภาพใบปาล์มหรือเลือกภาพจากเครื่อง" },
  { icon: Sparkles, title: "AI วิเคราะห์", desc: "ระบบประมวลผลภาพและจำแนกความผิดปกติ" },
  { icon: ClipboardList, title: "ดูผลลัพธ์", desc: "แสดง Class, Confidence และคำแนะนำเบื้องต้น" },
  { icon: History, title: "บันทึกประวัติ", desc: "ติดตามผลย้อนหลังได้ทุกเมื่อ" },
];

const highlights = [
  { icon: Layers, value: "4 กลุ่ม", label: "อาการที่ตรวจได้" },
  { icon: Clock, value: "< 10 วิ", label: "ต่อการวิเคราะห์ 1 ภาพ" },
  { icon: Gift, value: "ฟรี", label: "ไม่มีค่าใช้จ่าย" },
  { icon: Smartphone, value: "ทุกที่", label: "ใช้งานผ่านมือถือได้เลย" },
];

const diseaseCardStyles: Record<string, string> = {
  HEALTHY: "bg-success/10",
  BROWN_SPOT: "bg-warning/15",
  WHITE_SCALE: "bg-destructive/10",
};

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 md:flex-nowrap md:py-0 md:px-6">
          <div className="flex items-center gap-2 font-heading text-lg font-bold text-primary">
            <Leaf className="size-6" aria-hidden />
            PalmGuard
          </div>

          <nav aria-label="เมนูหลัก" className="hidden items-center gap-6 text-sm font-medium text-muted-foreground lg:flex">
            <a href="#how-it-works" className="hover:text-foreground">วิธีใช้งาน</a>
            <a href="#diseases" className="hover:text-foreground">กลุ่มอาการที่ตรวจได้</a>
            <a href="#about" className="hover:text-foreground">เกี่ยวกับโครงการ</a>
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="sm:h-9 sm:px-3 sm:text-sm">
              <Link href="/login">เข้าสู่ระบบ</Link>
            </Button>
            <Button asChild size="sm" className="rounded-full pl-4 pr-1.5 sm:h-9 sm:pl-4 sm:pr-1.5 sm:text-sm">
              <Link href="/register">
                สมัครสมาชิกฟรี
                <span className="ml-1 flex size-6 items-center justify-center rounded-full bg-primary-foreground/20">
                  <ArrowRight className="size-3.5" aria-hidden />
                </span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pt-12 pb-16 md:px-6 md:pt-16 md:pb-20">
          <div className="grid items-center gap-10 md:grid-cols-2 md:gap-8">
            <div>
              <span className="text-xs font-bold tracking-wide text-primary">
                ผู้ช่วยเกษตรกรตรวจใบปาล์มน้ำมัน
              </span>
              <h1 className="mt-3 text-balance text-4xl font-bold leading-tight text-foreground md:text-5xl">
                ตรวจโรคใบปาล์มน้ำมัน
                <br />
                รู้ผล<span className="text-primary">เบื้องต้นได้ทันที</span>
              </h1>
              <p className="mt-4 max-w-md text-balance text-base text-muted-foreground md:text-lg">
                PalmGuard ช่วยเกษตรกรตรวจสอบความผิดปกติของใบปาล์มน้ำมันจากภาพถ่าย
                พร้อมค่าความเชื่อมั่นและคำแนะนำเบื้องต้น ใช้งานง่ายผ่านมือถือ
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Button asChild size="lg" className="h-12 rounded-full pl-6 pr-2">
                  <Link href="/register">
                    เริ่มต้นการใช้งาน
                    <span className="ml-2 flex size-8 items-center justify-center rounded-full bg-primary-foreground/20">
                      <ArrowRight className="size-4" aria-hidden />
                    </span>
                  </Link>
                </Button>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-primary"
                >
                  ดูวิธีใช้งาน
                  <ArrowRight className="size-4" aria-hidden />
                </a>
              </div>
            </div>

            {/* Illustration */}
            <div className="relative mx-auto aspect-square w-full max-w-sm px-6 md:max-w-lg md:px-8">
              {/* Ambient glow blobs */}
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-6 rounded-full opacity-70 blur-3xl"
                style={{
                  background:
                    "radial-gradient(circle at 30% 25%, color-mix(in oklch, var(--primary) 35%, transparent), transparent 60%)",
                }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-8 -right-4 size-40 rounded-full opacity-60 blur-2xl"
                style={{ background: "var(--warning)" }}
              />

              {/* Photo card */}
              <div className="relative aspect-square overflow-hidden rounded-[2.5rem] shadow-2xl ring-1 ring-black/5">
                <Image
                  src="/auth-hero-1.png"
                  alt="สวนปาล์มน้ำมันที่ตรวจสอบด้วย PalmGuard"
                  fill
                  priority
                  sizes="(min-width: 768px) 32rem, 24rem"
                  className="object-cover"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(180deg, color-mix(in oklch, black 35%, transparent) 0%, transparent 30%, transparent 65%, color-mix(in oklch, black 55%, transparent) 100%)",
                  }}
                />

                {/* Scanning sweep animation */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden">
                  <div
                    aria-hidden
                    className="absolute inset-x-0 h-24 animate-[scan-sweep_3.5s_ease-in-out_infinite]"
                    style={{
                      background:
                        "linear-gradient(180deg, transparent, color-mix(in oklch, var(--success) 55%, transparent), transparent)",
                    }}
                  />
                </div>

                <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1.5 text-xs font-bold text-foreground shadow backdrop-blur">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-success" />
                  </span>
                  AI กำลังวิเคราะห์
                </span>
              </div>

              <div className="absolute -left-2 top-[22%] flex items-center gap-2 rounded-2xl bg-card px-3 py-2 shadow-xl ring-1 ring-border sm:-left-6">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                  <Clock className="size-4" aria-hidden />
                </span>
                <div className="text-left">
                  <p className="text-sm font-bold leading-none">&lt; 10 วิ</p>
                  <p className="text-xs text-muted-foreground">ผลวิเคราะห์ทันที</p>
                </div>
              </div>

              <div className="absolute -right-2 top-1/3 flex items-center gap-2 rounded-2xl bg-card px-3 py-2 shadow-xl ring-1 ring-border sm:-right-8">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning-foreground">
                  <Layers className="size-4" aria-hidden />
                </span>
                <div className="text-left">
                  <p className="text-sm font-bold leading-none">4 กลุ่ม</p>
                  <p className="text-xs text-muted-foreground">อาการที่ตรวจได้</p>
                </div>
              </div>

              <div className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-card px-3 py-2 shadow-xl ring-1 ring-border">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-foreground/10 text-primary">
                  <Gift className="size-4" aria-hidden />
                </span>
                <div className="text-left">
                  <p className="text-sm font-bold leading-none">ฟรี 100%</p>
                  <p className="text-xs text-muted-foreground">ไม่มีค่าใช้จ่าย</p>
                </div>
              </div>
            </div>
          </div>

          <div id="about" className="mx-auto mt-16 max-w-3xl rounded-2xl border border-border bg-card px-5 py-4 text-center">
            <p className="text-sm text-muted-foreground">
              โครงงานวิจัยนักศึกษา คณะวิทยาศาสตร์และเทคโนโลยีอุตสาหกรรม
              <br className="sm:hidden" /> มหาวิทยาลัยสงขลานครินทร์ วิทยาเขตสุราษฎร์ธานี
            </p>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mx-auto max-w-6xl px-4 pb-16 md:px-6 md:pb-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold tracking-wide text-primary">วิธีใช้งาน</span>
            <h2 className="mt-2 text-2xl font-bold md:text-3xl">ใช้งานง่าย เพียง 4 ขั้นตอน</h2>
            <p className="mt-2 text-muted-foreground">
              ตั้งแต่ถ่ายภาพจนได้ผลวิเคราะห์ ใช้เวลาไม่กี่วินาที
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-4">
            {steps.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className="relative flex flex-col items-center text-center">
                {i < steps.length - 1 && (
                  <div className="pointer-events-none absolute left-1/2 top-6 hidden h-px w-full border-t-2 border-dashed border-border md:block" />
                )}
                <div className="relative flex flex-col items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-card text-[10px] font-bold text-primary ring-1 ring-border">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-3 font-bold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Diseases */}
        <section id="diseases" className="mx-auto max-w-6xl px-4 pb-16 md:px-6 md:pb-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold tracking-wide text-primary">กลุ่มอาการที่ตรวจได้</span>
            <h2 className="mt-2 text-2xl font-bold md:text-3xl">จำแนกได้เบื้องต้น 3 กลุ่มอาการ</h2>
            <p className="mt-2 text-muted-foreground">
              พร้อมค่าความเชื่อมั่นและคำแนะนำเบื้องต้นในทุกผลลัพธ์
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {diseaseClasses.map((d) => {
              const Icon = diseaseVisual[d.code].icon;
              return (
                <Card key={d.code} className={diseaseCardStyles[d.code]}>
                  <CardHeader>
                    <span className="flex size-11 items-center justify-center rounded-full bg-card">
                      <Icon className="size-5 text-foreground" aria-hidden />
                    </span>
                    <CardTitle className="mt-3 text-base">{d.nameTh}</CardTitle>
                    <CardDescription>{d.nameEn}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">{d.description}</CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Highlights band */}
        <section className="mx-auto max-w-6xl px-4 pb-16 md:px-6 md:pb-20">
          <div className="rounded-3xl bg-primary px-6 py-10 text-primary-foreground md:px-10 md:py-12">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold md:text-3xl">ออกแบบมาเพื่อเกษตรกรโดยเฉพาะ</h2>
              <p className="mt-2 text-primary-foreground/80">
                เข้าถึงง่าย ไม่มีค่าใช้จ่าย ใช้งานได้ทันทีผ่านมือถือ
              </p>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
              {highlights.map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex flex-col items-center gap-2 text-center">
                  <span className="flex size-11 items-center justify-center rounded-full bg-primary-foreground/15">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-primary-foreground/80">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Disclaimer + CTA band */}
        <section className="mx-auto max-w-6xl px-4 pb-16 md:px-6 md:pb-20">
          <div className="grid overflow-hidden rounded-3xl border border-border md:grid-cols-2">
            <div className="flex flex-col gap-2 bg-muted/60 p-6 md:p-8">
              <div className="flex items-center gap-2 text-warning-foreground">
                <ShieldAlert className="size-5" aria-hidden />
                <h3 className="font-bold">คำแนะนำเบื้องต้นเท่านั้น</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                ผลการวิเคราะห์จาก PalmGuard เป็นเพียงคำแนะนำเบื้องต้น
                ไม่ใช่การวินิจฉัยทางการเกษตรอย่างเป็นทางการ และไม่ทดแทนผู้เชี่ยวชาญ
              </p>
            </div>
            <div className="flex flex-col items-start justify-center gap-3 bg-primary p-6 text-primary-foreground md:p-8">
              <h3 className="text-xl font-bold">พร้อมเริ่มต้นใช้งานหรือยัง?</h3>
              <p className="text-sm text-primary-foreground/80">
                สมัครสมาชิกฟรี แล้วเริ่มวินิจฉัยใบปาล์มของคุณได้ทันที
              </p>
              <Button asChild size="lg" variant="secondary" className="mt-1 h-11 rounded-full pl-5 pr-1.5">
                <Link href="/register">
                  สมัครสมาชิกฟรี
                  <span className="ml-2 flex size-7 items-center justify-center rounded-full bg-foreground/10">
                    <ArrowRight className="size-3.5" aria-hidden />
                  </span>
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 md:grid-cols-3 md:px-6">
          <div>
            <div className="flex items-center gap-2 font-heading text-lg font-bold text-primary">
              <Leaf className="size-6" aria-hidden />
              PalmGuard
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              ผู้ช่วยเกษตรกรตรวจสอบความผิดปกติเบื้องต้นของใบปาล์มน้ำมันด้วย AI
            </p>
          </div>

          <div>
            <h4 className="text-sm font-bold">ลิงก์ด่วน</h4>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
              <li>
                <a href="#how-it-works" className="hover:text-foreground">วิธีใช้งาน</a>
              </li>
              <li>
                <a href="#diseases" className="hover:text-foreground">กลุ่มอาการที่ตรวจได้</a>
              </li>
              <li>
                <Link href="/login" className="hover:text-foreground">เข้าสู่ระบบ</Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-foreground">สมัครสมาชิก</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold">เกี่ยวกับโครงการ</h4>
            <p className="mt-3 text-sm text-muted-foreground">
              โครงงานวิจัยนักศึกษาด้านวิทยาศาสตร์ คณะวิทยาศาสตร์และเทคโนโลยีอุตสาหกรรม
              มหาวิทยาลัยสงขลานครินทร์ วิทยาเขตสุราษฎร์ธานี
            </p>
          </div>
        </div>

        <div className="border-t border-border py-6 text-center text-sm text-muted-foreground">
          © 2026 PalmGuard — โครงงานตรวจสอบใบปาล์มน้ำมันเบื้องต้นด้วย AI
        </div>
      </footer>
    </div>
  );
}
