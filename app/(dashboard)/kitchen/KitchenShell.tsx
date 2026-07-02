'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { KitchenClient } from './KitchenClient'
import { Spinner } from '@/components/ui/Spinner/Spinner'
import styles from './KitchenShell.module.css'

export function KitchenShell() {
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (business) setBusinessId(business.id as string)
      setLoading(false)
    }

    init()
  }, [])

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" label="Loading kitchen…" />
      </div>
    )
  }

  if (!businessId) return null

  return <KitchenClient businessId={businessId} />
}
