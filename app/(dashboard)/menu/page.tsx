import { createClient } from '@/lib/supabase/server'
import { MenuClient } from './MenuClient'
import type { Product } from '@/lib/types/database.types'

export const metadata = { title: 'Menu' }

export default async function MenuPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user!.id)
    .single()

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('business_id', business?.id ?? '')
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  return <MenuClient products={(products as Product[]) ?? []} />
}
