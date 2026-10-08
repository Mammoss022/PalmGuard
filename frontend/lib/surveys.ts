// Real UAT satisfaction-survey calls against the Backend (backend/app/api/v1/surveys.py).

import { apiFetch } from "@/lib/api-client";
import type { SatisfactionSurvey } from "@/lib/types";

export interface SurveyResponseRaw {
  id: string;
  satisfaction_rating: number;
  ease_of_use_rating: number;
  accuracy_rating: number;
  would_recommend: boolean;
  comments: string | null;
  created_at: string;
}

export function mapSurvey(raw: SurveyResponseRaw): SatisfactionSurvey {
  return {
    id: raw.id,
    satisfactionRating: raw.satisfaction_rating,
    easeOfUseRating: raw.ease_of_use_rating,
    accuracyRating: raw.accuracy_rating,
    wouldRecommend: raw.would_recommend,
    comments: raw.comments,
    createdAt: raw.created_at,
  };
}

export interface SurveyStatus {
  hasSubmitted: boolean;
  eligibleForPrompt: boolean;
  survey: SatisfactionSurvey | null;
}

export async function getSurveyStatus(): Promise<SurveyStatus> {
  const raw = await apiFetch<{ has_submitted: boolean; eligible_for_prompt: boolean; survey: SurveyResponseRaw | null }>("/surveys/me");
  return { hasSubmitted: raw.has_submitted, eligibleForPrompt: raw.eligible_for_prompt, survey: raw.survey ? mapSurvey(raw.survey) : null };
}

export async function createSurvey(input: {
  satisfactionRating: number;
  easeOfUseRating: number;
  accuracyRating: number;
  wouldRecommend: boolean;
  comments?: string;
}): Promise<SatisfactionSurvey> {
  const raw = await apiFetch<SurveyResponseRaw>("/surveys", {
    method: "POST",
    body: {
      satisfaction_rating: input.satisfactionRating,
      ease_of_use_rating: input.easeOfUseRating,
      accuracy_rating: input.accuracyRating,
      would_recommend: input.wouldRecommend,
      comments: input.comments || undefined,
    },
  });
  return mapSurvey(raw);
}
