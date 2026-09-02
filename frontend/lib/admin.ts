// Admin-only API calls (backend/app/api/v1/admin.py) — the Backend enforces
// the actual admin check (require_admin dependency); this just talks to it.

import { apiFetch } from "@/lib/api-client";
import type { AppUser, Diagnosis, DiagnosisResult, DiagnosisStatus, DiseaseCode, UserRole } from "@/lib/types";

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

export async function listUsers(params?: { page?: number; pageSize?: number }): Promise<{
  items: AppUser[];
  total: number;
}> {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 50;
  const raw = await apiFetch<{ items: UserResponseRaw[]; total: number }>(
    `/admin/users?page=${page}&page_size=${pageSize}`
  );
  return { items: raw.items.map(mapUser), total: raw.total };
}

export async function getUser(userId: string): Promise<AppUser> {
  const raw = await apiFetch<UserResponseRaw>(`/admin/users/${userId}`);
  return mapUser(raw);
}

interface DiagnosisResultRaw {
  class_code: string;
  name_th: string;
  confidence_score: number;
  recommendation_th: string | null;
  class_probabilities: Record<string, number> | null;
}

interface DiagnosisRaw {
  id: string;
  image_url: string;
  status: DiagnosisStatus;
  result: DiagnosisResultRaw | null;
  created_at: string;
}

function mapResult(raw: DiagnosisResultRaw | null): DiagnosisResult | null {
  if (!raw) return null;
  return {
    classCode: raw.class_code as DiseaseCode,
    nameTh: raw.name_th,
    confidenceScore: raw.confidence_score,
    recommendationTh: raw.recommendation_th,
    classProbabilities: raw.class_probabilities as Partial<Record<DiseaseCode, number>> | null,
  };
}

function mapDiagnosis(raw: DiagnosisRaw): Diagnosis {
  return {
    id: raw.id,
    imageUrl: raw.image_url,
    status: raw.status,
    result: mapResult(raw.result),
    createdAt: raw.created_at,
  };
}

export async function listUserDiagnoses(
  userId: string,
  params?: { page?: number; pageSize?: number }
): Promise<{ items: Diagnosis[]; total: number }> {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 50;
  const raw = await apiFetch<{ items: DiagnosisRaw[]; total: number }>(
    `/admin/diagnoses?user_id=${userId}&page=${page}&page_size=${pageSize}`
  );
  return { items: raw.items.map(mapDiagnosis), total: raw.total };
}
