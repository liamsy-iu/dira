import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/lib/types/database.types'

interface DiraStore {
  // Data shared across all dashboard tabs
  businessId: string | null
  businessName: string
  products: Product[]
  initialized: boolean

  // Actions
  initialize: () => Promise<void>
  refreshProducts: () => Promise<void>
}

export const useDiraStore = create<DiraStore>((set, get) => ({
  businessId: null,
  businessName: '',
  products: [],
  initialized: false,

  initialize: async () => {
    // Guard — only runs once per session
    if (get().initialized) return

    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Single parallel fetch — business + products in one round trip each
    const { data: business } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('owner_id', user.id)
      .single()

    if (!business) return

    const businessId = business.id as string

    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_available', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    set({
      businessId,
      businessName: business.name as string,
      products: (products as Product[]) ?? [],
      initialized: true,
    })

    // Realtime: when products change in Menu, POS updates automatically
    // without any manual refresh
    supabase
      .channel('store-products')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `business_id=eq.${businessId}`,
        },
        () => get().refreshProducts()
      )
      .subscribe()
  },

  refreshProducts: async () => {
    const { businessId } = get()
    if (!businessId) return

    const supabase = createClient()
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_available', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (data) set({ products: data as Product[] })
  },
}))
