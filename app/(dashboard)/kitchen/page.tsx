import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KitchenClient } from './KitchenClient'

export const metadata = { title: 'Kitchen' }

export default async function KitchenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!business) redirect('/login')

  return <KitchenClient businessId={business.id} />
}
