'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useDiraStore } from '@/lib/store/dira'
import { MenuClient } from './MenuClient'
import { Spinner } from '@/components/ui/Spinner/Spinner'
import type { Product } from '@/lib/types/database.types'

export default function MenuPage() {
  const businessId = useDiraStore((s) => s.businessId)
  const initialized = useDiraStore((s) => s.initialized)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!businessId) return
    // Menu needs ALL products (including unavailable) for management
    const supabase = createClient()
    supabase
      .from('products')
      .select('*')
      .eq('business_id', businessId)
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
      .then(({ data }) => {
        setProducts((data as Product[]) ?? [])
        setLoading(false)
      })
  }, [businessId])

  if (!initialized || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-16)' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  return <MenuClient products={products} />
}
