'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { POSClient } from './POSClient'
import { Spinner } from '@/components/ui/Spinner/Spinner'
import { RefreshCw } from 'lucide-react'
import type { Product } from '@/lib/types/database.types'
import styles from './POSShell.module.css'

export function POSShell() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadProducts = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    else setLoading(true)

    setError(null)

    try {
      const supabase = createClient()

      // Get business ID from current session
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not authenticated.'); return }

      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (!business) { setError('Business not found.'); return }

      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_available', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (productsError) { setError('Failed to load products.'); return }

      setProducts((products as Product[]) ?? [])
    } catch {
      setError('Network error. Check your connection.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Load once on mount — stays in memory for the whole session
  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" label="Loading products…" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>{error}</p>
        <button className={styles['retry-btn']} onClick={() => loadProducts()}>
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      {/* Cashier can refresh products mid-shift without reloading the page */}
      <button
        className={`${styles['refresh-btn']} ${refreshing ? styles.spinning : ''}`}
        onClick={() => loadProducts(true)}
        disabled={refreshing}
        title="Refresh products"
        aria-label="Refresh products"
      >
        <RefreshCw size={14} strokeWidth={1.5} />
      </button>

      <POSClient products={products} />
    </div>
  )
}
