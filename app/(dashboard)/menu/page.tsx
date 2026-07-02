import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBusinessByOwner, getAllProducts } from '@/lib/data/queries'
import { MenuClient } from './MenuClient'
import type { Product } from '@/lib/types/database.types'

export const metadata = { title: 'Menu' }

export default async function MenuPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const business = await getBusinessByOwner(user.id)
  if (!business) redirect('/login')

  const products = await getAllProducts(business.id)

  return <MenuClient products={(products as Product[]) ?? []} />
}
