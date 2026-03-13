import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { WearablesClient } from './_client'

export default async function WearablesPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/auth/signin')

  const supabase = getAdminClient()

  const { data: connections } = await supabase
    .from('wearable_connections')
    .select('provider, connected_at')
    .eq('user_id', session.user.id)

  const connected = new Set(
    (connections ?? []).map((c: { provider: string }) => c.provider)
  )

  return (
    <WearablesClient
      initialConnected={Array.from(connected)}
    />
  )
}
