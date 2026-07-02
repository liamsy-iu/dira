'use client'

import { useEffect } from 'react'
import { useDiraStore } from '@/lib/store/dira'

/**
 * Invisible component placed in the dashboard layout.
 * Triggers the global store initialization once on first render.
 * Every subsequent tab switch finds data already in memory.
 */
export function StoreInitializer() {
  const initialize = useDiraStore((s) => s.initialize)
  const initialized = useDiraStore((s) => s.initialized)

  useEffect(() => {
    if (!initialized) initialize()
  }, [initialize, initialized])

  return null
}
