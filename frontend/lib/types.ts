// Types mirror the real Backend responses (docs/DATABASE.md, docs/API.md).

export type UserRole = "farmer" | "admin";

export interface AppUser {
  hasSubmittedSurvey?: boolean;
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  role: UserRole;
  createdAt: string;
}

export type DiseaseCode = "HEALTHY" | "BROWN_SPOT" | "WHITE_SCALE" | "NON_PALM";

export interface DiseaseClass {
  code: DiseaseCode;
  nameTh: string;
  nameEn: string;
  description: string;
  recommendationTh: string;
}

export type DiagnosisStatus = "processing" | "completed" | "failed";

// Mirrors DiagnosisResponse.result (backend/app/schemas/diagnosis.py) — only
// present when status === "completed".
export interface DiagnosisResult {
  classCode: DiseaseCode;
  nameTh: string;
  confidenceScore: number;
  recommendationTh: string | null;
  // Probability per disease class (0.0-1.0), for the 3 real disease classes
  // only (never NON_PALM) — null for diagnoses predating this field, or when
  // the AI backend couldn't produce a breakdown.
  classProbabilities: Partial<Record<DiseaseCode, number>> | null;
}

// Mirrors DiagnosisResponse (backend/app/schemas/diagnosis.py).
export interface Diagnosis {
  id: string;
  imageUrl: string;
  status: DiagnosisStatus;
  failureReason?: string | null;
  result: DiagnosisResult | null;
  createdAt: string;
}

// Mirrors SurveyResponse (backend/app/schemas/survey.py) — UAT satisfaction survey.
export interface SatisfactionSurvey {
  id: string;
  satisfactionRating: number;
  easeOfUseRating: number;
  accuracyRating: number;
  wouldRecommend: boolean;
  comments: string | null;
  createdAt: string;
}
