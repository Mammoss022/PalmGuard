import { apiFetch } from "@/lib/api-client";

export interface CountItem { code: string; label: string; count: number }
export interface ClassMetric { code: string; precision: number; recall: number; f1: number; support: number }
export interface EvaluationSet { name: string; accuracy: number; precision: number; recall: number; f1: number; support: number; per_class: ClassMetric[] }
export interface AdminDashboard {
  days: number;
  start_at: string;
  end_at: string;
  users: { total: number; new_users: number; active_users: number; admins: number; farmers: number };
  ai: { total: number; completed: number; failed: number; processing: number; mean_confidence: number | null; low_confidence: number; admin_corrected: number; diseases: CountItem[]; daily: CountItem[] };
  assessments: { total: number; mean_severity: number | null; risks: CountItem[]; symptoms: CountItem[]; satisfaction_count: number; mean_satisfaction: number | null; mean_ease_of_use: number | null; mean_accuracy_rating: number | null };
  comparison: { eligible: number; agreed: number; disagreed: number; excluded: number; agreement_rate: number | null; matrix: { assessment_code: string; ai_code: string; count: number }[] };
  model: { available: boolean; model_version: string | null; source: string | null; reason: string | null; datasets: EvaluationSet[] };
}

export function getAdminDashboard(days: number): Promise<AdminDashboard> {
  return apiFetch<AdminDashboard>(`/admin/dashboard?days=${days}`);
}
