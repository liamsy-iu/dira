'use client'

import { useDiraStore } from '@/lib/store/dira'
import { TablesClient } from './TablesClient'
import { Spinner } from '@/components/ui/Spinner/Spinner'

export default function TablesPage() {
  const tables = useDiraStore((s) => s.tables)
  const initialized = useDiraStore((s) => s.initialized)

  // Tables already loaded in store on init — renders instantly on tab switch
  if (!initialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-16)' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  return <TablesClient tables={tables} baseUrl={baseUrl} />
}
