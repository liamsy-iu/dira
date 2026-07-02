'use client'

import { useDiraStore } from '@/lib/store/dira'
import { POSClient } from './POSClient'
import { Spinner } from '@/components/ui/Spinner/Spinner'
import { RefreshCw } from 'lucide-react'
import styles from './POSShell.module.css'

export function POSShell() {
  const products = useDiraStore((s) => s.products)
  const initialized = useDiraStore((s) => s.initialized)
  const refreshProducts = useDiraStore((s) => s.refreshProducts)

  // Data is already in the store from StoreInitializer —
  // this renders instantly on tab switch, no Supabase call needed
  if (!initialized) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" label="Loading products…" />
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <button
        className={styles['refresh-btn']}
        onClick={() => refreshProducts()}
        title="Refresh products"
        aria-label="Refresh products"
      >
        <RefreshCw size={14} strokeWidth={1.5} />
      </button>
      <POSClient products={products} />
    </div>
  )
}
