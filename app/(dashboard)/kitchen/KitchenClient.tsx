'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { KitchenCard } from './KitchenCard'
import { ChefHat } from 'lucide-react'
import styles from './page.module.css'

interface OrderItem {
  id: string
  product_name: string
  quantity: number
  modifier_summary: string | null
}

interface KitchenOrder {
  id: string
  order_ref: string
  status: 'pending' | 'confirmed' | 'preparing' | 'ready'
  created_at: string
  dining_tables: { label: string } | null
  order_items: OrderItem[]
}

const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready']

export function KitchenClient({ businessId }: { businessId: string }) {
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())
  const supabase = createClient()

  const loadOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select(`
        id, order_ref, status, created_at,
        dining_tables ( label ),
        order_items ( id, product_name, quantity, modifier_summary )
      `)
      .eq('business_id', businessId)
      .in('status', ACTIVE_STATUSES)
      .order('created_at', { ascending: true })

    setOrders((data as unknown as KitchenOrder[]) ?? [])
    setLoading(false)
  }, [businessId, supabase])

  // Initial load
  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`kitchen-${businessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `business_id=eq.${businessId}`,
        },
        () => loadOrders()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [businessId, supabase, loadOrders])

  // Update elapsed times every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  // Group by status
  const pending   = orders.filter((o) => o.status === 'pending')
  const confirmed = orders.filter((o) => o.status === 'confirmed')
  const preparing = orders.filter((o) => o.status === 'preparing')
  const ready     = orders.filter((o) => o.status === 'ready')

  if (loading) {
    return (
      <div className={styles.loading}>
        <span className={styles['loading-text']}>Loading orders…</span>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className={styles.empty}>
        <ChefHat size={40} strokeWidth={1} />
        <p>No active orders</p>
        <span>New orders will appear here instantly</span>
      </div>
    )
  }

  return (
    <div className={styles.board}>
      {/* Column: New */}
      <div className={styles.column}>
        <div className={`${styles['col-header']} ${styles['col-pending']}`}>
          <span>New</span>
          {pending.length > 0 && (
            <span className={styles['col-count']}>{pending.length}</span>
          )}
        </div>
        <div className={styles['col-cards']}>
          {pending.map((order) => (
            <KitchenCard key={order.id} order={order} now={now} />
          ))}
        </div>
      </div>

      {/* Column: Accepted */}
      <div className={styles.column}>
        <div className={`${styles['col-header']} ${styles['col-confirmed']}`}>
          <span>Accepted</span>
          {confirmed.length > 0 && (
            <span className={styles['col-count']}>{confirmed.length}</span>
          )}
        </div>
        <div className={styles['col-cards']}>
          {confirmed.map((order) => (
            <KitchenCard key={order.id} order={order} now={now} />
          ))}
        </div>
      </div>

      {/* Column: Preparing */}
      <div className={styles.column}>
        <div className={`${styles['col-header']} ${styles['col-preparing']}`}>
          <span>Preparing</span>
          {preparing.length > 0 && (
            <span className={styles['col-count']}>{preparing.length}</span>
          )}
        </div>
        <div className={styles['col-cards']}>
          {preparing.map((order) => (
            <KitchenCard key={order.id} order={order} now={now} />
          ))}
        </div>
      </div>

      {/* Column: Ready */}
      <div className={styles.column}>
        <div className={`${styles['col-header']} ${styles['col-ready']}`}>
          <span>Ready</span>
          {ready.length > 0 && (
            <span className={styles['col-count']}>{ready.length}</span>
          )}
        </div>
        <div className={styles['col-cards']}>
          {ready.map((order) => (
            <KitchenCard key={order.id} order={order} now={now} />
          ))}
        </div>
      </div>
    </div>
  )
}
