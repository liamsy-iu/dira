import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TablesClient } from './TablesClient'

export const metadata = { title: 'Tables' }

export default async function TablesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  const { data: tables } = await supabase
    .from('dining_tables')
    .select('id, label, status, qr_token')
    .eq('business_id', business?.id ?? '')
    .order('created_at', { ascending: true })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return <TablesClient tables={tables ?? []} baseUrl={baseUrl} />
}
