// Real diagnosis calls against the Backend (docs/API.md#diagnosis-endpoints) —
// replaces lib/mock-data.ts's mockDiagnoses and lib/mock-diagnose.ts's
// generateMockResult. The Backend's synchronous Gemini call (see
// backend/app/services/ai_inference.py) means POST /diagnoses returns the
// finished result directly — no polling/sessionStorage hand-off needed.

import { apiFetch } from "@/lib/api-client";
import type { Diagnosis, DiagnosisResult, DiagnosisStatus, DiseaseCode } from "@/lib/types";

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

interface DiagnosisListRaw {
  items: DiagnosisRaw[];
  page: number;
  page_size: number;
  total: number;
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

export async function createDiagnosis(image: File): Promise<Diagnosis> {
  const formData = new FormData();
  formData.append("image", image);
  const raw = await apiFetch<DiagnosisRaw>("/diagnoses", { method: "POST", formData });
  return mapDiagnosis(raw);
}

export async function getDiagnosis(id: string): Promise<Diagnosis> {
  const raw = await apiFetch<DiagnosisRaw>(`/diagnoses/${id}`);
  return mapDiagnosis(raw);
}

export async function listDiagnoses(params?: { page?: number; pageSize?: number }): Promise<{
  items: Diagnosis[];
  total: number;
}> {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 50;
  const raw = await apiFetch<DiagnosisListRaw>(`/diagnoses?page=${page}&page_size=${pageSize}`);
  return { items: raw.items.map(mapDiagnosis), total: raw.total };
}
