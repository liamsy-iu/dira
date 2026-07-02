'use client'

import { useDiraStore } from '@/lib/store/dira'
import { SettingsForm } from './SettingsForm'
import { Spinner } from '@/components/ui/Spinner/Spinner'
import styles from './page.module.css'

export default function SettingsPage() {
  const business = useDiraStore((s) => s.business)
  const initialized = useDiraStore((s) => s.initialized)

  // Business data already in store — instant render
  if (!initialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-16)' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (!business) return null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>Settings</h2>
        <p className={styles.subtitle}>Manage your business profile</p>
      </div>
      <SettingsForm business={business} />
    </div>
  )
}
