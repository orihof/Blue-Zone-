import { createClient } from '@supabase/supabase-js';

export const MOCK_PIPELINE = process.env.MOCK_PIPELINE === 'true';
export const MOCK_DELAY = parseInt(process.env.MOCK_PIPELINE_DELAY_MS ?? '10000', 10);

export async function runMockPipeline(userId: string): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: profile } = await supabase
    .from('profiles')
    .select('primary_goal')
    .eq('id', userId)
    .single();

  const goal = profile?.primary_goal ?? 'baseline_health';

  await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));

  await supabase.from('protocols').upsert({
    user_id: userId,
    status: 'ready',
    content: {
      generated_at: new Date().toISOString(),
      goal,
      summary: `[MOCK] Placeholder protocol for goal: ${goal}`,
      domains: {
        nutrition: { recommendations: ['[MOCK] Nutrition recommendation'], priority: 'high' },
        exercise: { recommendations: ['[MOCK] Exercise recommendation'], priority: 'high' },
        sleep: { recommendations: ['[MOCK] Sleep recommendation'], priority: 'medium' },
        supplements: { recommendations: ['[MOCK] Supplements recommendation'], priority: 'medium' },
        biomarkers: { recommendations: ['[MOCK] Biomarkers recommendation'], priority: 'medium' },
        recovery: { recommendations: ['[MOCK] Recovery recommendation'], priority: 'low' },
        longevity: { recommendations: ['[MOCK] Longevity recommendation'], priority: 'low' },
        mental_performance: { recommendations: ['[MOCK] Mental performance recommendation'], priority: 'low' },
      },
      safety_flags: {
        pregnancy_safe_mode: false,
        pregnancy_question_declined: false,
        use_sex_neutral_ranges: false,
      },
    },
  });
}
