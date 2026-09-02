import { LayoutDashboard, ScanLine, History, User } from "lucide-react";

export const navItems = [
  { href: "/dashboard", label: "หน้าหลัก", icon: LayoutDashboard },
  { href: "/diagnose", label: "วินิจฉัย", icon: ScanLine },
  { href: "/history", label: "ประวัติ", icon: History },
  { href: "/profile", label: "โปรไฟล์", icon: User },
] as const;
