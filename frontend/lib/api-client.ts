// Real HTTP client for the PalmGuard backend (docs/API.md) — replaces the
// mock localStorage session. Base URL points at the FastAPI server.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const ACCESS_TOKEN_KEY = "palmguard:access_token";
const REFRESH_TOKEN_KEY = "palmguard:refresh_token";

export interface ApiErrorDetail {
  field: string;
  issue: string;
}

export class ApiError extends Error {
  status: number;
  details?: ApiErrorDetail[];

  constructor(status: number, message: string, details?: ApiErrorDetail[]) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setTokens(accessToken: string, refreshToken?: string): void {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch {
    // localStorage unavailable (SSR/private mode) — tokens simply won't persist.
  }
}

export function clearTokens(): void {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // ignore
  }
}

async function parseErrorBody(res: Response): Promise<{ message: string; details?: ApiErrorDetail[] }> {
  try {
    const body = await res.json();
    return {
      message: body?.error?.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
      details: body?.error?.details,
    };
  } catch {
    return { message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" };
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  formData?: FormData;
  /** Attach the Authorization header (default true). Set false for public/auth endpoints. */
  auth?: boolean;
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!res.ok) {
          clearTokens();
          return false;
        }
        const data = await res.json();
        setTokens(data.access_token);
        return true;
      } catch {
        clearTokens();
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, formData, auth = true } = options;

  const doFetch = async (accessToken: string | null): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    let payload: BodyInit | undefined;
    if (formData) {
      payload = formData;
    } else if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }

    return fetch(`${API_BASE_URL}${path}`, { method, headers, body: payload });
  };

  let res = await doFetch(auth ? getAccessToken() : null);

  if (res.status === 401 && auth) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      res = await doFetch(getAccessToken());
    }
  }

  if (!res.ok) {
    const { message, details } = await parseErrorBody(res);
    throw new ApiError(res.status, message, details);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
