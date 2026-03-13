import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const IMPORT_PROVIDERS = ['apple_health', 'samsung_health'] as const

const bodySchema = z.object({
  provider: z.enum([
    'whoop', 'oura', 'strava',
    'apple_health', 'samsung_health'
  ]),
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const json = await req.json()
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid provider' },
      { status: 400 }
    )
  }

  const { provider } = parsed.data
  const supabase = getAdminClient()

  const isImport = (IMPORT_PROVIDERS as readonly string[]).includes(provider)

  if (isImport) {
    const { error } = await supabase
      .from('wearable_upload_events')
      .insert({
        user_id: session.user.id,
        device_type: provider,
        scenario: 'onboarding_baseline',
        is_first_upload: true,
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  const { error } = await supabase
    .from('wearable_connections')
    .upsert(
      {
        user_id: session.user.id,
        provider,
        access_token: isImport ? 'manual_import' : 'pending_oauth',
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, provider })
}
