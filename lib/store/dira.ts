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
  refresh: () => Promise<void>
  refreshProducts: () => Promise<void>
  refreshTables: () => Promise<void>
  updateBusiness: (data: Partial<Business>) => void
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

function cacheKey(businessId: string) {
  return `dira-v1-${businessId}`
}

function readCache(businessId: string): { products: Product[]; tables: DiningTable[] } | null {
  try {
    const raw = localStorage.getItem(cacheKey(businessId))
    if (!raw) return null
    const { products, tables, ts } = JSON.parse(raw)
    if (Date.now() - ts > 5 * 60 * 1000) return null
    return { products, tables }
  } catch {
    return null
  }
}

function writeCache(businessId: string, products: Product[], tables: DiningTable[]) {
  try {
    localStorage.setItem(cacheKey(businessId), JSON.stringify({ products, tables, ts: Date.now() }))
  } catch {}
}

// ── Realtime subscriptions ────────────────────────────────────────────────────

function subscribeRealtime(businessId: string) {
  const supabase = createClient()
  const existing = supabase.getChannels().find(c => c.topic === 'store-products')
  if (existing) return

  supabase
    .channel('store-products')
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'products',
      filter: `business_id=eq.${businessId}`,
    }, () => useDiraStore.getState().refreshProducts())
    .subscribe()

  supabase
    .channel('store-tables')
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'dining_tables',
      filter: `business_id=eq.${businessId}`,
    }, () => useDiraStore.getState().refreshTables())
    .subscribe()
}

// ── Data loader (module-level so it's not part of the store type) ─────────────

async function loadData(
  businessId: string,
  businessName: string,
  existingBusiness?: Business
): Promise<{
  products: Product[]
  tables: DiningTable[]
  business: Business | null
}> {
  const supabase = createClient()

  const [productsRes, tablesRes, businessRes] = await Promise.all([
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
    existingBusiness
      ? Promise.resolve({ data: existingBusiness })
      : supabase
          .from('businesses')
          .select('id, name, phone, email, kra_pin, address')
          .eq('id', businessId)
          .single(),
  ])

  const products = (productsRes.data as Product[]) ?? []
  const tables   = (tablesRes.data as DiningTable[]) ?? []

  writeCache(businessId, products, tables)

  // Set up Realtime subscriptions once
  const existingChannel = supabase.getChannels().find(c => c.topic === 'store-products')
  if (!existingChannel) {
    supabase
      .channel('store-products')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'products',
        filter: `business_id=eq.${businessId}`,
      }, () => useDiraStore.getState().refreshProducts())
      .subscribe()

    supabase
      .channel('store-tables')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'dining_tables',
        filter: `business_id=eq.${businessId}`,
      }, () => useDiraStore.getState().refreshTables())
      .subscribe()
  }

  return { products, tables, business: businessRes.data as Business | null }
}

// ── Store ─────────────────────────────────────────────────────────────────────

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
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const businessId   = session.user.app_metadata?.business_id   as string | undefined
    const businessName = session.user.app_metadata?.business_name as string | undefined

    // Check localStorage cache first — show instantly, refresh in background
    if (businessId) {
      const cached = readCache(businessId)
      if (cached) {
        set({ businessId, businessName: businessName ?? '', products: cached.products, tables: cached.tables, initialized: true })
        get().refresh()
        return
      }
    }

    // Try the prefetch that was fired before React booted
    // If it's ready, we get data with zero additional network wait
    try {
      const prefetched = await (window as any).__dira_prefetch
      if (prefetched?.business && prefetched?.products) {
        const bid = prefetched.business.id as string
        writeCache(bid, prefetched.products, prefetched.tables ?? [])
        set({
          businessId:   bid,
          businessName: prefetched.business.name as string,
          business:     prefetched.business,
          products:     prefetched.products,
          tables:       prefetched.tables ?? [],
          initialized:  true,
        })
        subscribeRealtime(bid)
        return
      }
    } catch {}

    // Fallback: standard Supabase fetch
    if (!businessId) {
      const { data: business } = await supabase
        .from('businesses')
        .select('id, name, phone, email, kra_pin, address')
        .eq('owner_id', session.user.id)
        .single()
      if (!business) return
      const result = await loadData(business.id as string, business.name as string, business as Business)
      set({ businessId: business.id as string, businessName: business.name as string, ...result, initialized: true })
      return
    }

    const result = await loadData(businessId, businessName ?? '')
    set({ businessId, businessName: businessName ?? '', ...result, initialized: true })
  },

  refresh: async () => {
    const { businessId, businessName } = get()
    if (!businessId) return
    const result = await loadData(businessId, businessName)
    set(result)
  },

  refreshProducts: async () => {
    const { businessId, tables } = get()
    if (!businessId) return
    const supabase = createClient()
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_available', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true })
    if (data) {
      set({ products: data as Product[] })
      writeCache(businessId, data as Product[], tables)
    }
  },

  refreshTables: async () => {
    const { businessId, products } = get()
    if (!businessId) return
    const supabase = createClient()
    const { data } = await supabase
      .from('dining_tables')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: true })
    if (data) {
      set({ tables: data as DiningTable[] })
      writeCache(businessId, products, data as DiningTable[])
    }
  },

  updateBusiness: (data) => {
    set((s) => ({
      business: s.business ? { ...s.business, ...data } : null,
      businessName: data.name ?? s.businessName,
    }))
  },
}))
