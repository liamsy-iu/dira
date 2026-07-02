'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useDiraStore } from '@/lib/store/dira'
import { PrintButton } from './PrintButton'
import styles from './page.module.css'

function formatKES(cents: number) {
  return `KES ${(cents / 100).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`
}

export function ReportsTab() {
  const businessId   = useDiraStore((s) => s.businessId)
  const businessName = useDiraStore((s) => s.businessName)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!businessId) return
    const supabase = createClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    supabase
      .from('orders')
      .select(`id, order_ref, status, payment_method, payment_status, subtotal, tax, total, created_at, dining_tables ( label ), order_items ( product_name, quantity, unit_price, subtotal )`)
      .eq('business_id', businessId)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })
      .then(({ data }) => { setOrders(data ?? []); setLoading(false) })
  }, [businessId])

  const paidOrders   = orders.filter((o: any) => o.payment_status === 'completed')
  const totalRevenue = paidOrders.reduce((s: number, o: any) => s + (o.total ?? 0), 0)
  const totalTax     = paidOrders.reduce((s: number, o: any) => s + (o.tax ?? 0), 0)
  const cashRevenue  = paidOrders.filter((o: any) => o.payment_method === 'cash').reduce((s: number, o: any) => s + (o.total ?? 0), 0)
  const mpesaRevenue = paidOrders.filter((o: any) => o.payment_method === 'mpesa').reduce((s: number, o: any) => s + (o.total ?? 0), 0)

  const productMap = new Map<string, { name: string; qty: number; revenue: number }>()
  for (const order of paidOrders) {
    for (const item of (order.order_items as any[]) ?? []) {
      const e = productMap.get(item.product_name)
      if (e) { e.qty += item.quantity; e.revenue += item.subtotal }
      else productMap.set(item.product_name, { name: item.product_name, qty: item.quantity, revenue: item.subtotal })
    }
  }
  const topProducts = [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  const dateLabel = new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Z-Report</h2>
          <p className={styles.subtitle}>{dateLabel} · {businessName}</p>
        </div>
        <PrintButton />
      </div>
      <div className={styles['stats-grid']}>
        <div className={styles.stat}><span className={styles['stat-label']}>Revenue</span><span className={styles['stat-value']}>{formatKES(totalRevenue)}</span><span className={styles['stat-sub']}>{paidOrders.length} paid orders</span></div>
        <div className={styles.stat}><span className={styles['stat-label']}>Cash</span><span className={styles['stat-value']}>{formatKES(cashRevenue)}</span><span className={styles['stat-sub']}>{paidOrders.filter((o: any) => o.payment_method === 'cash').length} orders</span></div>
        <div className={styles.stat}><span className={styles['stat-label']}>M-Pesa</span><span className={styles['stat-value']}>{formatKES(mpesaRevenue)}</span><span className={styles['stat-sub']}>{paidOrders.filter((o: any) => o.payment_method === 'mpesa').length} orders</span></div>
        <div className={styles.stat}><span className={styles['stat-label']}>VAT collected</span><span className={styles['stat-value']}>{formatKES(totalTax)}</span><span className={styles['stat-sub']}>16% of subtotal</span></div>
      </div>
      {topProducts.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles['section-title']}>Top products</h3>
          <div className={styles.table}>
            <div className={`${styles.row} ${styles['row-header']}`}><span>Product</span><span className={styles['col-right']}>Qty</span><span className={styles['col-right']}>Revenue</span></div>
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
      <div className={styles.section}>
        <h3 className={styles['section-title']}>All orders today <span className={styles['section-count']}>{orders.length}</span></h3>
        {orders.length === 0 ? <p className={styles.empty}>No orders yet today</p> : (
          <div className={styles.table}>
            <div className={`${styles.row} ${styles['row-header']}`}><span>Ref</span><span>Table</span><span>Payment</span><span>Status</span><span className={styles['col-right']}>Total</span><span className={styles['col-right']}>Time</span></div>
            {orders.map((o: any) => (
              <div key={o.id} className={styles.row}>
                <span className={styles.mono}>{o.order_ref}</span>
                <span>{o.dining_tables?.label ?? 'Walk-in'}</span>
                <span className={styles.caps}>{o.payment_method ?? '—'}</span>
                <span className={`${styles.caps} ${styles[`status-${o.payment_status}`]}`}>{o.payment_status}</span>
                <span className={`${styles['col-right']} ${styles.mono}`}>{formatKES(o.total)}</span>
                <span className={styles['col-right']}>{new Date(o.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
