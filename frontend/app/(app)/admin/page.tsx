"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import styles from "@/components/admin/admin.module.css";
import { useAuth } from "@/lib/auth-context";
import { listUsers } from "@/lib/admin";
import { formatThaiDateTime } from "@/lib/disease-ui";
import type { AppUser } from "@/lib/types";

export default function AdminUsersPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AppUser[] | null>(null);

  useEffect(() => {
    if (currentUser.role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    let cancelled = false;
    listUsers({ pageSize: 100 })
      .then((res) => {
        if (!cancelled) setUsers(res.items);
      })
      .catch(() => {
        if (!cancelled) setUsers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser, router]);

  if (currentUser.role !== "admin" || users === null) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" aria-hidden />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className={styles.listMeta}><span>แสดง <strong>{users.length}</strong> บัญชี</span><span>เลือกผู้ใช้เพื่อดูข้อมูลและประวัติการวิเคราะห์</span></div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex size-9 items-center justify-center rounded-full bg-accent text-primary">
              <Users className="size-4" aria-hidden />
            </span>
            รายชื่อผู้ใช้
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">ผู้ใช้</th>
                  <th className="py-2 pr-4 font-medium">อีเมล</th>
                  <th className="py-2 pr-4 font-medium">สิทธิ์</th>
                  <th className="py-2 pr-4 font-medium">สมัครเมื่อ</th>
                  <th className="py-2 pr-4 font-medium">แบบประเมิน</th>
                  <th className="py-2 pr-0 text-right font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const initials = u.fullName
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("");
                  return (
                    <tr key={u.id} className="border-b border-border last:border-0">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <Avatar size="sm">
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{u.fullName}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{u.email}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                          {u.role === "admin" ? (
                            <>
                              <ShieldCheck data-icon="inline-start" /> ผู้ดูแลระบบ
                            </>
                          ) : (
                            "เกษตรกร"
                          )}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">
                        {formatThaiDateTime(u.createdAt)}
                      </td>
                      <td className="py-3 pr-4"><Badge variant={u.hasSubmittedSurvey ? "default" : "secondary"}>{u.hasSubmittedSurvey ? "ตอบแล้ว" : "ยังไม่ตอบ"}</Badge></td>
                      <td className="py-3 pr-0 text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/users/${u.id}`}>ดูรายละเอียด</Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {users.map((u) => {
              const initials = u.fullName
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("");
              return (
                <Link
                  key={u.id}
                  href={`/admin/users/${u.id}`}
                  className={`flex items-center gap-3 transition-colors hover:bg-muted/60 ${styles.mobileUser}`}
                >
                  <Avatar>
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate font-medium">{u.fullName}</span>
                      <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                        {u.role === "admin" ? "ผู้ดูแลระบบ" : "เกษตรกร"}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">แบบประเมิน: {u.hasSubmittedSurvey ? "ตอบแล้ว" : "ยังไม่ตอบ"}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
