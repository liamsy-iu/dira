import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/ui/Card/Card'
import styles from './page.module.css'

async function DashboardStats() {
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Run all queries in parallel — eliminates sequential waterfall
  const [ordersResult, tablesResult] = await Promise.all([
    supabase
      .from('orders')
      .select('total, status, payment_status')
      .gte('created_at', today.toISOString()),
    supabase
      .from('dining_tables')
      .select('status'),
  ])

  const orders = ordersResult.data ?? []
  const tables = tablesResult.data ?? []

  const totalRevenue = orders
    .filter((o) => o.payment_status === 'completed')
    .reduce((sum, o) => sum + (o.total ?? 0), 0)

  const orderCount   = orders.length
  const pendingCount = orders.filter((o) => o.status === 'pending').length
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length
  const tableCount   = tables.length

  const formatKES = (amount: number) =>
    `KES ${(amount / 100).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`

  return (
    <div className={styles['stats-grid']}>
      <StatCard
        label="Revenue today"
        value={formatKES(totalRevenue)}
        sub="Paid orders only"
      />
      <StatCard
        label="Orders today"
        value={String(orderCount)}
        sub={pendingCount > 0 ? `${pendingCount} pending` : 'All clear'}
      />
      <StatCard
        label="Avg order value"
        value={orderCount > 0 ? formatKES(Math.round(totalRevenue / orderCount)) : 'KES 0.00'}
        sub="Today"
      />
      <StatCard
        label="Active tables"
        value={tableCount > 0 ? `${occupiedCount} / ${tableCount}` : '—'}
        sub={tableCount > 0 ? 'Occupied / total' : 'No tables added yet'}
      />
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className={styles['stats-grid']}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={styles['stat-skeleton']} aria-hidden="true" />
      ))}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>Overview</h2>
        <p className={styles.subtitle}>
          {new Date().toLocaleDateString('en-KE', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>
      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats />
      </Suspense>
    </div>
  )
}
