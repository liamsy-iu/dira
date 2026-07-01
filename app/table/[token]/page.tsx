import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TableOrderClient } from './TableOrderClient'
import type { Product } from '@/lib/types/database.types'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function TablePage({ params }: PageProps) {
  const { token } = await params
  const supabase = await createClient()

  // Resolve token → table + business (public, no auth)
  const { data: table } = await supabase
    .from('dining_tables')
    .select('id, label, business_id')
    .eq('qr_token', token)
    .single()

  if (!table) notFound()

  const { data: business } = await supabase
    .from('businesses')
    .select('name')
    .eq('id', table.business_id)
    .single()

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('business_id', table.business_id)
    .eq('is_available', true)
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  return (
    <TableOrderClient
      token={token}
      tableLabel={table.label}
      businessName={business?.name ?? 'Café'}
      products={(products as Product[]) ?? []}
    />
  )
}
