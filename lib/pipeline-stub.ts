import { createClient } from '@supabase/supabase-js';

// Used ONLY when ONBOARDING_AUDIT.md documents no existing pipeline code.
// Sets status: 'failed' to enable end-to-end testing of two-strike error handling.
export async function runPipelineStub(userId: string): Promise<void> {
  console.warn('[PIPELINE STUB] No real pipeline found — setting status: failed');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  await new Promise(resolve => setTimeout(
    resolve,
    parseInt(process.env.MOCK_PIPELINE_DELAY_MS ?? '2000', 10)
  ));

  await supabase.from('protocols').upsert({
    user_id: userId,
    status: 'failed',
  });
}
