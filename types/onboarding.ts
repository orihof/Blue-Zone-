export type OnboardingStep =
  | 'name' | 'consent' | 'goals' | 'personal_info'
  | 'blood_test' | 'wearables' | 'analysis' | 'done' | 'data';

export type PrimaryGoal =
  | 'sports_competition' | 'longevity' | 'energy_recovery' | 'baseline_health';

export type BiologicalSex = 'male' | 'female' | 'prefer_not_to_say';

export type ActivityLevel =
  | 'sedentary' | 'lightly_active' | 'moderately_active'
  | 'very_active' | 'elite_athlete';

export type PregnancyStatus = 'yes' | 'no' | 'prefer_not_to_say';

export interface PersonalInfoFormState {
  age: string;
  biological_sex: BiologicalSex | '';
  pregnancy_status: PregnancyStatus | '';
  height_cm: string;
  weight_kg: string;
  activity_level: ActivityLevel | '';
  current_injuries: string;
  current_medications: string;
  current_supplements: string;
  conditions: string;
}

export const EMPTY_PERSONAL_INFO: PersonalInfoFormState = {
  age: '', biological_sex: '', pregnancy_status: '',
  height_cm: '', weight_kg: '', activity_level: '',
  current_injuries: '', current_medications: '',
  current_supplements: '', conditions: '',
};

export interface OnboardingState {
  currentStep: OnboardingStep;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  consecutiveFailureCount: number;
  personalInfoDraft: PersonalInfoFormState;
  selectedGoal: PrimaryGoal | null;
  userName: string;
  userId: string;
  pushGranted: boolean;
  notifyByEmail: boolean;
  analysisInProgress: boolean;
  pipelineFailureCount: number;
}

export interface OnboardingStepProps {
  state: OnboardingState;
  onAdvance: () => void;
  onBack?: () => void;
  isSaving: boolean;
}

export const STEP_ORDER: OnboardingStep[] = [
  'name', 'consent', 'goals', 'personal_info',
  'blood_test', 'wearables', 'analysis', 'done',
];

export function stepIndex(step: OnboardingStep): number {
  if (step === 'data') return STEP_ORDER.indexOf('done');
  return STEP_ORDER.indexOf(step);
}
