"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardList, Leaf, LogOut, ShieldCheck, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems } from "@/components/layout/nav-items";
import { useAuth } from "@/lib/auth-context";
import { logout } from "@/lib/auth";
import styles from "./site-header.module.css";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const historyPage = pathname === "/history" || pathname === "/diagnose" || pathname === "/dashboard" || pathname === "/profile" || pathname.startsWith("/admin");

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  const initials = currentUser.fullName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <header className="sticky top-0 z-40 hidden border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:block">
      <div className={cn("mx-auto flex h-16 max-w-5xl items-center justify-between px-6", historyPage && styles.historyInner, pathname === "/dashboard" && styles.dashboardInner)}>
        <Link href="/dashboard" className={cn("flex items-center gap-2 font-heading text-lg font-bold text-primary", historyPage && styles.historyLogo)}>
          {historyPage ? <><span className={styles.logoMark}><Leaf className="size-7" aria-hidden /></span><span><span className={styles.logoTitle}>PalmGuard</span><span className={styles.logoSubtitle}>ดูแลปาล์ม ให้คุณก้าวไกล</span></span></> : <><Leaf className="size-6" aria-hidden />PalmGuard</>}
        </Link>

        <nav aria-label="เมนูหลัก" className={cn("flex items-center gap-1", historyPage && styles.historyNav)}>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger aria-label="เมนูบัญชีผู้ใช้" className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Avatar>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{currentUser.fullName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <UserIcon /> โปรไฟล์
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/survey")}><ClipboardList /> แบบประเมิน</DropdownMenuItem>
            {currentUser.role === "admin" && (
              <DropdownMenuItem onClick={() => router.push("/admin/dashboard")}>
                <ShieldCheck /> Dashboard ผู้ดูแลระบบ
              </DropdownMenuItem>
            )}
            {currentUser.role === "admin" && (
              <DropdownMenuItem onClick={() => router.push("/admin")}>
                <ShieldCheck /> ผู้ดูแลระบบ
              </DropdownMenuItem>
            )}
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut /> ออกจากระบบ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
