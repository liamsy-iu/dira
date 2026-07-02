import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/lib/types/database.types'

interface Business {
  id: string
  name: string
  phone: string | null
  email: string | null
  kra_pin: string | null
  address: string | null
}

interface DiningTable {
  id: string
  label: string
  status: string
  qr_token: string
  business_id: string
  created_at: string
}

interface DiraStore {
  businessId: string | null
  businessName: string
  business: Business | null
  products: Product[]
  tables: DiningTable[]
  initialized: boolean

  initialize: () => Promise<void>
  refreshProducts: () => Promise<void>
  refreshTables: () => Promise<void>
  updateBusiness: (data: Partial<Business>) => void
}

export const useDiraStore = create<DiraStore>((set, get) => ({
  businessId: null,
  businessName: '',
  business: null,
  products: [],
  tables: [],
  initialized: false,

  initialize: async () => {
    if (get().initialized) return

    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Round trip 1: get business
    const { data: business } = await supabase
      .from('businesses')
      .select('id, name, phone, email, kra_pin, address')
      .eq('owner_id', user.id)
      .single()

    if (!business) return

    const businessId = business.id as string

    // Round trip 2: products + tables in parallel — single network wait
    const [productsRes, tablesRes] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_available', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true }),
      supabase
        .from('dining_tables')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: true }),
    ])

    set({
      businessId,
      businessName: business.name as string,
      business: business as Business,
      products: (productsRes.data as Product[]) ?? [],
      tables: (tablesRes.data as DiningTable[]) ?? [],
      initialized: true,
    })

    // Realtime: product changes update the store automatically
    supabase
      .channel('store-products')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'products',
        filter: `business_id=eq.${businessId}`,
      }, () => get().refreshProducts())
      .subscribe()

    // Realtime: table status changes (occupied/available) update the store
    supabase
      .channel('store-tables')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'dining_tables',
        filter: `business_id=eq.${businessId}`,
      }, () => get().refreshTables())
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

  refreshTables: async () => {
    const { businessId } = get()
    if (!businessId) return
    const supabase = createClient()
    const { data } = await supabase
      .from('dining_tables')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: true })
    if (data) set({ tables: data as DiningTable[] })
  },

  updateBusiness: (data) => {
    set((s) => ({
      business: s.business ? { ...s.business, ...data } : null,
      businessName: data.name ?? s.businessName,
    }))
  },
}))
