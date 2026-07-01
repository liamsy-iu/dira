import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { POSClient } from './POSClient'
import type { Product } from '@/lib/types/database.types'

export const metadata = { title: 'POS' }

export default async function POSPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('business_id', business?.id ?? '')
    .eq('is_available', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  return <POSClient products={(products as Product[]) ?? []} />
}
