'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { updateOrderStatusAction } from '@/lib/actions/orders'
import { KitchenCard } from './KitchenCard'
import { ChefHat } from 'lucide-react'
import type { OrderStatus } from '@/lib/types/database.types'
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
  status: OrderStatus
  created_at: string
  payment_method: string | null
  mpesa_receipt: string | null
  dining_tables: { label: string } | null
  order_items: OrderItem[]
}

const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready']

export function KitchenClient({ businessId }: { businessId: string }) {
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())
  const [, startTransition] = useTransition()
  const supabase = createClient()

  const loadOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select(`
        id, order_ref, status, created_at, payment_method, mpesa_receipt,
        dining_tables ( label ),
        order_items ( id, product_name, quantity, modifier_summary )
      `)
      .eq('business_id', businessId)
      .in('status', ACTIVE_STATUSES)
      .order('created_at', { ascending: true })

    setOrders((data as unknown as KitchenOrder[]) ?? [])
    setLoading(false)
  }, [businessId, supabase])

  useEffect(() => { loadOrders() }, [loadOrders])

  useEffect(() => {
    const channel = supabase
      .channel(`kitchen-${businessId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `business_id=eq.${businessId}` },
        () => loadOrders()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [businessId, supabase, loadOrders])

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  // ── Optimistic advance ─────────────────────────────────────────────────────
  // Card moves INSTANTLY to new column. Server confirms in background.
  // If server fails, card snaps back.
  function handleAdvance(orderId: string, currentStatus: OrderStatus, nextStatus: OrderStatus) {
    // 1. Optimistic update
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: nextStatus } : o))

    startTransition(async () => {
      const result = await updateOrderStatusAction(orderId, nextStatus)
      if (result.error) {
        // Revert on failure
        setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: currentStatus } : o))
      }
    })
  }

  const pending   = orders.filter((o) => o.status === 'pending')
  const confirmed = orders.filter((o) => o.status === 'confirmed')
  const preparing = orders.filter((o) => o.status === 'preparing')
  const ready     = orders.filter((o) => o.status === 'ready')

  if (loading) return <div className={styles.loading}><span className={styles['loading-text']}>Loading orders…</span></div>

  if (orders.length === 0) {
    return (
      <div className={styles.empty}>
        <ChefHat size={40} strokeWidth={1} />
        <p>No active orders</p>
        <span>New orders will appear here instantly</span>
      </div>
    )
  }

  const columns = [
    { key: 'pending',   label: 'New',      cls: styles['col-pending'],   orders: pending },
    { key: 'confirmed', label: 'Accepted',  cls: styles['col-confirmed'], orders: confirmed },
    { key: 'preparing', label: 'Preparing', cls: styles['col-preparing'], orders: preparing },
    { key: 'ready',     label: 'Ready',     cls: styles['col-ready'],     orders: ready },
  ]

  return (
    <div className={styles.board}>
      {columns.map((col) => (
        <div key={col.key} className={styles.column}>
          <div className={`${styles['col-header']} ${col.cls}`}>
            <span>{col.label}</span>
            {col.orders.length > 0 && (
              <span className={styles['col-count']}>{col.orders.length}</span>
            )}
          </div>
          <div className={styles['col-cards']}>
            {/* AnimatePresence + layout makes cards glide between columns */}
            <AnimatePresence mode="popLayout">
              {col.orders.map((order) => (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, scale: 0.92, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 8 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >
                  <KitchenCard
                    order={order}
                    now={now}
                    onAdvance={handleAdvance}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  )
}
