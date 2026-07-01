import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatKES } from '@/lib/utils'
import { PrintButton } from './PrintButton'
import styles from './page.module.css'

export const metadata = { title: 'Reports' }

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()

  if (!business) redirect('/login')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = today.toISOString()

  // Fetch today's orders with items
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id, order_ref, status, payment_method, payment_status,
      subtotal, tax, total, created_at,
      dining_tables ( label ),
      order_items ( product_name, quantity, unit_price, subtotal )
    `)
    .eq('business_id', business.id)
    .gte('created_at', todayISO)
    .order('created_at', { ascending: false })

  const allOrders = orders ?? []
  const paidOrders = allOrders.filter((o) => o.payment_status === 'completed')

  // Totals
  const totalRevenue = paidOrders.reduce((s, o) => s + (o.total ?? 0), 0)
  const totalTax     = paidOrders.reduce((s, o) => s + (o.tax ?? 0), 0)
  const cashRevenue  = paidOrders.filter((o) => o.payment_method === 'cash').reduce((s, o) => s + (o.total ?? 0), 0)
  const mpesaRevenue = paidOrders.filter((o) => o.payment_method === 'mpesa').reduce((s, o) => s + (o.total ?? 0), 0)

  // Top products
  const productMap = new Map<string, { name: string; qty: number; revenue: number }>()
  for (const order of paidOrders) {
    for (const item of (order.order_items as any[]) ?? []) {
      const existing = productMap.get(item.product_name)
      if (existing) {
        existing.qty += item.quantity
        existing.revenue += item.subtotal
      } else {
        productMap.set(item.product_name, { name: item.product_name, qty: item.quantity, revenue: item.subtotal })
      }
    }
  }
  const topProducts = [...productMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  const dateLabel = new Date().toLocaleDateString('en-KE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Z-Report</h2>
          <p className={styles.subtitle}>{dateLabel} · {business.name}</p>
        </div>
        <PrintButton />
      </div>

      {/* Stats */}
      <div className={styles['stats-grid']}>
        <div className={styles.stat}>
          <span className={styles['stat-label']}>Revenue</span>
          <span className={styles['stat-value']}>{formatKES(totalRevenue)}</span>
          <span className={styles['stat-sub']}>{paidOrders.length} paid orders</span>
        </div>
        <div className={styles.stat}>
          <span className={styles['stat-label']}>Cash</span>
          <span className={styles['stat-value']}>{formatKES(cashRevenue)}</span>
          <span className={styles['stat-sub']}>{paidOrders.filter((o) => o.payment_method === 'cash').length} orders</span>
        </div>
        <div className={styles.stat}>
          <span className={styles['stat-label']}>M-Pesa</span>
          <span className={styles['stat-value']}>{formatKES(mpesaRevenue)}</span>
          <span className={styles['stat-sub']}>{paidOrders.filter((o) => o.payment_method === 'mpesa').length} orders</span>
        </div>
        <div className={styles.stat}>
          <span className={styles['stat-label']}>VAT collected</span>
          <span className={styles['stat-value']}>{formatKES(totalTax)}</span>
          <span className={styles['stat-sub']}>16% of subtotal</span>
        </div>
      </div>

      {/* Top products */}
      {topProducts.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles['section-title']}>Top products</h3>
          <div className={styles.table}>
            <div className={`${styles.row} ${styles['row-header']}`}>
              <span>Product</span>
              <span className={styles['col-right']}>Qty</span>
              <span className={styles['col-right']}>Revenue</span>
            </div>
            {topProducts.map((p) => (
              <div key={p.name} className={styles.row}>
                <span className={styles['row-name']}>{p.name}</span>
                <span className={styles['col-right']}>{p.qty}</span>
                <span className={`${styles['col-right']} ${styles.mono}`}>{formatKES(p.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All orders */}
      <div className={styles.section}>
        <h3 className={styles['section-title']}>
          All orders today
          <span className={styles['section-count']}>{allOrders.length}</span>
        </h3>
        {allOrders.length === 0 ? (
          <p className={styles.empty}>No orders yet today</p>
        ) : (
          <div className={styles.table}>
            <div className={`${styles.row} ${styles['row-header']}`}>
              <span>Ref</span>
              <span>Table</span>
              <span>Payment</span>
              <span>Status</span>
              <span className={styles['col-right']}>Total</span>
              <span className={styles['col-right']}>Time</span>
            </div>
            {allOrders.map((order: any) => (
              <div key={order.id} className={styles.row}>
                <span className={styles.mono}>{order.order_ref}</span>
                <span>{order.dining_tables?.label ?? 'Walk-in'}</span>
                <span className={styles.caps}>{order.payment_method ?? '—'}</span>
                <span className={`${styles.caps} ${styles[`status-${order.payment_status}`]}`}>
                  {order.payment_status}
                </span>
                <span className={`${styles['col-right']} ${styles.mono}`}>{formatKES(order.total)}</span>
                <span className={styles['col-right']}>
                  {new Date(order.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
