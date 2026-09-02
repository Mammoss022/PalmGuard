// Real auth against the Backend (docs/API.md#authentication-endpoints) —
// replaces the mock localStorage "session" that used to fake Register/Login.

import { apiFetch, clearTokens, setTokens } from "@/lib/api-client";
import type { AppUser, UserRole } from "@/lib/types";

interface TokenResponseRaw {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

interface UserResponseRaw {
  id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  role: UserRole;
  created_at: string;
}

function mapUser(raw: UserResponseRaw): AppUser {
  return {
    id: raw.id,
    email: raw.email,
    fullName: raw.full_name,
    phoneNumber: raw.phone_number ?? undefined,
    role: raw.role,
    createdAt: raw.created_at,
  };
}

export async function login(email: string, password: string): Promise<AppUser> {
  const tokens = await apiFetch<TokenResponseRaw>("/auth/login", {
    method: "POST",
    auth: false,
    body: { email, password },
  });
  setTokens(tokens.access_token, tokens.refresh_token);
  return fetchCurrentUser();
}

export async function register(input: {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
}): Promise<AppUser> {
  await apiFetch<UserResponseRaw>("/auth/register", {
    method: "POST",
    auth: false,
    body: {
      email: input.email,
      password: input.password,
      full_name: input.fullName,
      phone_number: input.phoneNumber || undefined,
    },
  });
  return login(input.email, input.password);
}

export async function fetchCurrentUser(): Promise<AppUser> {
  const raw = await apiFetch<UserResponseRaw>("/users/me");
  return mapUser(raw);
}

export async function updateProfile(input: { fullName?: string; phoneNumber?: string }): Promise<AppUser> {
  const raw = await apiFetch<UserResponseRaw>("/users/me", {
    method: "PATCH",
    body: { full_name: input.fullName, phone_number: input.phoneNumber },
  });
  return mapUser(raw);
}

export async function logout(): Promise<void> {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch {
    // Stateless logout server-side — clearing local tokens below is what matters.
  } finally {
    clearTokens();
  }
}
