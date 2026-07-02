import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Called by an inline <script> in the layout before React hydrates.
 * Returns business + products + tables in a single response.
 * The Zustand store reads this from window.__dira_data instead of
 * making separate Supabase calls, eliminating the initialization delay.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json(null)

    const { data: business } = await supabase
      .from('businesses')
      .select('id, name, phone, email, kra_pin, address')
      .eq('owner_id', user.id)
      .single()

    if (!business) return NextResponse.json(null)

    const [productsRes, tablesRes] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_available', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true }),
      supabase
        .from('dining_tables')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: true }),
    ])

    return NextResponse.json({
      business,
      products: productsRes.data ?? [],
      tables: tablesRes.data ?? [],
    }, {
      headers: {
        // Cache for 30 seconds at the edge — fresh enough for a POS
        'Cache-Control': 's-maxage=30, stale-while-revalidate=60',
      },
    })
  } catch {
    return NextResponse.json(null)
  }
}
