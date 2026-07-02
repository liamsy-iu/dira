'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useDiraStore } from '@/lib/store/dira'
import { StatCard } from '@/components/ui/Card/Card'
import styles from './page.module.css'

function formatKES(cents: number) {
  return `KES ${(cents / 100).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`
}

export function Overview() {
  const businessId = useDiraStore((s) => s.businessId)
  const tables     = useDiraStore((s) => s.tables)
  const initialized = useDiraStore((s) => s.initialized)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!businessId) return
    const supabase = createClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    supabase
      .from('orders')
      .select('total, status, payment_status')
      .eq('business_id', businessId)
      .gte('created_at', today.toISOString())
      .then(({ data }) => { setOrders(data ?? []); setLoading(false) })
  }, [businessId])

  const paidOrders    = orders.filter((o) => o.payment_status === 'completed')
  const totalRevenue  = paidOrders.reduce((s, o) => s + (o.total ?? 0), 0)
  const orderCount    = orders.length
  const pendingCount  = orders.filter((o) => o.status === 'pending').length
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length

  const skeletons = !initialized || loading

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>Overview</h2>
        <p className={styles.subtitle}>
          {new Date().toLocaleDateString('en-KE', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}
        </p>
      </div>

      {skeletons ? (
        <div className={styles['stats-grid']}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles['stat-skeleton']} aria-hidden="true" />
          ))}
        </div>
      ) : (
        <div className={styles['stats-grid']}>
          <StatCard label="Revenue today" value={formatKES(totalRevenue)} sub="Paid orders only" />
          <StatCard label="Orders today" value={String(orderCount)} sub={pendingCount > 0 ? `${pendingCount} pending` : 'All clear'} />
          <StatCard label="Avg order value" value={orderCount > 0 ? formatKES(Math.round(totalRevenue / orderCount)) : 'KES 0.00'} sub="Today" />
          <StatCard
            label="Active tables"
            value={tables.length > 0 ? `${occupiedCount} / ${tables.length}` : '—'}
            sub={tables.length > 0 ? 'Occupied / total' : 'No tables added yet'}
          />
        </div>
      )}
    </div>
  )
}
