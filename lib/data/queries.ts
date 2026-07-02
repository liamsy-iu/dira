import { unstable_cache } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Cached business lookup by owner ID.
 * 5-minute TTL — revalidated when settings are saved.
 */
export const getBusinessByOwner = unstable_cache(
  async (ownerId: string) => {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('businesses')
      .select('id, name, phone, email, kra_pin, address')
      .eq('owner_id', ownerId)
      .single()
    return data
  },
  ['business-by-owner'],
  { revalidate: 300, tags: ['business'] }
)

/**
 * Cached available products for a business.
 * 30-second TTL — revalidated when products change.
 * Used by POS and QR ordering pages.
 */
export const getAvailableProducts = unstable_cache(
  async (businessId: string) => {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_available', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true })
    return data
  },
  ['available-products'],
  { revalidate: 30, tags: ['products'] }
)

/**
 * Cached full product list (including unavailable) for menu management.
 * 30-second TTL.
 */
export const getAllProducts = unstable_cache(
  async (businessId: string) => {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', businessId)
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
    return data
  },
  ['all-products'],
  { revalidate: 30, tags: ['products'] }
)
