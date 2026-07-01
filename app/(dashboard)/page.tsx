import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/ui/Card/Card'
import styles from './page.module.css'

// ── Stat cards (server-rendered) ─────────────
async function DashboardStats() {
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: orders } = await supabase
    .from('orders')
    .select('total, status, payment_status')
    .gte('created_at', today.toISOString())

  const totalRevenue = orders
    ?.filter((o) => o.payment_status === 'completed')
    .reduce((sum, o) => sum + (o.total ?? 0), 0) ?? 0

  const orderCount = orders?.length ?? 0
  const pendingCount = orders?.filter((o) => o.status === 'pending').length ?? 0

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
        value={orderCount > 0 ? formatKES(totalRevenue / orderCount) : 'KES 0'}
        sub="Today"
      />
      <StatCard
        label="Active tables"
        value="—"
        sub="Coming in Phase 4"
      />
    </div>
  )
}

// ── Skeleton while stats load ─────────────────
function StatsSkeleton() {
  return (
    <div className={styles['stats-grid']}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={styles['stat-skeleton']} aria-hidden="true" />
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────
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
