'use client'

import { useDiraStore } from '@/lib/store/dira'
import { KitchenClient } from './KitchenClient'
import { Spinner } from '@/components/ui/Spinner/Spinner'
import styles from './KitchenShell.module.css'

export function KitchenShell() {
  const businessId = useDiraStore((s) => s.businessId)
  const initialized = useDiraStore((s) => s.initialized)

  // businessId already in store — no separate fetch needed
  if (!initialized) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" label="Loading kitchen…" />
      </div>
    )
  }

  if (!businessId) return null

  return <KitchenClient businessId={businessId} />
}
