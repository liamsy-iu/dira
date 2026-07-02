import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { TableOrderClient } from './TableOrderClient'
import type { Product } from '@/lib/types/database.types'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function TablePage({ params }: PageProps) {
  const { token } = await params

  // Service client — this is a PUBLIC page, customers have no session.
  // RLS would block all reads since dining_tables, businesses, and products
  // all require auth.uid() to match the owner. Service client bypasses that
  // for these safe, read-only, customer-facing queries.
  const supabase = createServiceClient()

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
      tableLabel={table.label as string}
      businessName={business?.name ?? 'Café'}
      products={(products as Product[]) ?? []}
    />
  )
}
