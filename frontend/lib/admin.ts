// Admin-only API calls (backend/app/api/v1/admin.py) — the Backend enforces
// the actual admin check (require_admin dependency); this just talks to it.

import { apiFetch } from "@/lib/api-client";
import type { AppUser, Diagnosis, DiagnosisResult, DiagnosisStatus, DiseaseCode, UserRole, SatisfactionSurvey } from "@/lib/types";
import { mapSurvey, type SurveyResponseRaw } from "@/lib/surveys";

interface UserResponseRaw {
  has_submitted_survey: boolean;
  id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  role: UserRole;
  created_at: string;
}

function mapUser(raw: UserResponseRaw): AppUser {
  return {
    hasSubmittedSurvey: raw.has_submitted_survey,
    id: raw.id,
    email: raw.email,
    fullName: raw.full_name,
    phoneNumber: raw.phone_number ?? undefined,
    role: raw.role,
    createdAt: raw.created_at,
  };
}

export interface AdminSurvey extends SatisfactionSurvey {
  userId: string;
  userName: string;
  userEmail: string;
}

export interface RatingCount { score: number; count: number }
export interface SurveySummary {
  total_responses: number;
  total_users: number;
  responded_users: number;
  avg_satisfaction_rating: number | null;
  avg_ease_of_use_rating: number | null;
  avg_accuracy_rating: number | null;
  would_recommend_rate: number | null;
  recommend_count: number;
  not_recommend_count: number;
  satisfaction_distribution: RatingCount[];
  ease_of_use_distribution: RatingCount[];
  accuracy_distribution: RatingCount[];
}

export async function listAdminSurveys(params: { userId?: string; page?: number; pageSize?: number } = {}): Promise<{ items: AdminSurvey[]; total: number }> {
  const query = new URLSearchParams({ page: String(params.page ?? 1), page_size: String(params.pageSize ?? 20) });
  if (params.userId) query.set("user_id", params.userId);
  const raw = await apiFetch<{items: (SurveyResponseRaw & {user_id: string; user_name: string; user_email: string})[]; total: number}>(`/admin/surveys?${query}`);
  return { total: raw.total, items: raw.items.map(s => ({ ...mapSurvey(s), userId: s.user_id, userName: s.user_name, userEmail: s.user_email })) };
}

export function getSurveySummary(): Promise<SurveySummary> {
  return apiFetch<SurveySummary>("/admin/surveys/summary");
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

export interface AdminDiagnosis extends Diagnosis {
  userId: string;
  userName: string;
  userEmail: string;
}

type AdminDiagnosisRaw = DiagnosisRaw & { user_id: string; user_name: string; user_email: string };

function mapAdminDiagnosis(raw: AdminDiagnosisRaw): AdminDiagnosis {
  return { ...mapDiagnosis(raw), userId: raw.user_id, userName: raw.user_name, userEmail: raw.user_email };
}

export async function listAdminDiagnoses(params: { q?: string; status?: string; classCode?: string; page?: number } = {}): Promise<{ items: AdminDiagnosis[]; total: number }> {
  const query = new URLSearchParams({ page: String(params.page ?? 1), page_size: "20" });
  if (params.q) query.set("q", params.q);
  if (params.status) query.set("status", params.status);
  if (params.classCode) query.set("class_code", params.classCode);
  const raw = await apiFetch<{ items: AdminDiagnosisRaw[]; total: number }>(`/admin/diagnoses?${query}`);
  return { items: raw.items.map(mapAdminDiagnosis), total: raw.total };
}

export async function updateAdminDiagnosis(id: string, payload: { status: "completed" | "failed"; class_code?: string; confidence_score?: number }): Promise<AdminDiagnosis> {
  return mapAdminDiagnosis(await apiFetch<AdminDiagnosisRaw>(`/admin/diagnoses/${id}`, { method: "PATCH", body: payload }));
}

export function deleteAdminDiagnosis(id: string): Promise<void> {
  return apiFetch<void>(`/admin/diagnoses/${id}`, { method: "DELETE" });
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
