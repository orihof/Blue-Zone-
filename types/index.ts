// ============================================================
// Blue Zone — Shared TypeScript Types
// ============================================================

// ------ Database row types ----------------------------------

export interface HealthSnapshot {
  id: string;
  user_id: string;
  created_at: string;
  source: "blood_test" | "apple_health" | "whoop";
  raw_file_url: string | null;
  parsed_data: ParsedHealthData | null;
  ai_summary: string | null;
}

export interface Biomarker {
  id: string;
  snapshot_id: string;
  name: string;
  value: number;
  unit: string;
  reference_min: number | null;
  reference_max: number | null;
  status: "normal" | "low" | "high" | "critical";
}

export interface Recommendation {
  id: string;
  user_id: string;
  snapshot_id: string;
  type: "product" | "clinic";
  title: string;
  description: string;
  url: string;
  source: "iherb" | "amazon" | "google_places";
  reason: string;
  created_at: string;
}

// ------ Parsed data shapes ----------------------------------

export interface ParsedHealthData {
  biomarkers?: ExtractedBiomarker[];
  apple_health?: AppleHealthMetrics;
  whoop?: WhoopData;
}

export interface ExtractedBiomarker {
  name: string;
  value: number;
  unit: string;
  reference_min?: number;
  reference_max?: number;
}

export interface AppleHealthMetrics {
  hrv?: HealthRecord[];
  resting_heart_rate?: HealthRecord[];
  vo2_max?: HealthRecord[];
  step_count?: HealthRecord[];
  body_mass?: HealthRecord[];
}

export interface HealthRecord {
  value: string;
  unit: string;
  startDate: string;
  endDate: string;
}

export interface WhoopData {
  recovery?: WhoopRecoveryEntry[];
  sleep?: WhoopSleepEntry[];
  workouts?: WhoopWorkoutEntry[];
}

export interface WhoopRecoveryEntry {
  created_at: string;
  score: {
    recovery_score: number;
    resting_heart_rate: number;
    hrv_rmssd_milli: number;
    sleep_performance_percentage: number;
  } | null;
}

export interface WhoopSleepEntry {
  start: string;
  end: string;
  score: {
    stage_summary: {
      total_in_bed_time_milli: number;
      total_awake_time_milli: number;
      total_rem_sleep_time_milli: number;
      total_slow_wave_sleep_time_milli: number;
    };
    sleep_performance_percentage: number;
    sleep_efficiency_percentage: number;
  } | null;
}

export interface WhoopWorkoutEntry {
  start: string;
  end: string;
  sport_id: number;
  score: {
    strain: number;
    average_heart_rate: number;
    max_heart_rate: number;
    kilojoule: number;
  } | null;
}

// ------ AI output types -------------------------------------

export interface AIAnalysisResult {
  summary: string;
  product_recommendations: ProductRecommendation[];
  clinic_recommendations: ClinicRecommendation[];
}

export interface ProductRecommendation {
  product_name: string;
  category: "supplement" | "device" | "food" | "service";
  reason: string;
  search_query_iherb: string;
  search_query_amazon: string;
}

export interface ClinicRecommendation {
  clinic_type: string;
  reason: string;
}

// ------ Google Places types ---------------------------------

export interface NearbyClinic {
  name: string;
  address: string;
  rating: number | null;
  place_id: string;
  maps_url: string;
  clinic_type: string;
}

// ------ WHOOP OAuth token -----------------------------------

export interface WhoopTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

// ------ API response shapes ---------------------------------

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface UploadResponse {
  snapshot_id: string;
  file_url: string;
  parsed_data: ParsedHealthData;
}

export interface AnalyzeResponse {
  snapshot_id: string;
  summary: string;
  biomarkers: Biomarker[];
  recommendations: Recommendation[];
}

export interface ClinicsResponse {
  clinics: NearbyClinic[];
}
