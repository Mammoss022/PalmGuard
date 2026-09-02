"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/api-client";
import { fetchCurrentUser } from "@/lib/auth";
import type { AppUser } from "@/lib/types";

interface AuthContextValue {
  user: AppUser;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Gates every (app) page behind a real session — fetches GET /users/me and
 * redirects to /login when there's no valid token instead of falling back
 * to a mock user. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [failed, setFailed] = useState(false);

  async function load() {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    try {
      setUser(await fetchCurrentUser());
    } catch {
      setFailed(true);
      router.replace("/login");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        {failed ? "กรุณาเข้าสู่ระบบ" : "กำลังโหลด..."}
      </div>
    );
  }

  return <AuthContext.Provider value={{ user, refresh: load }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
