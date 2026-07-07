'use client'

import type { OrderStatus } from '@/lib/types/database.types'
import styles from './KitchenCard.module.css'

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

interface KitchenCardProps {
  order: KitchenOrder
  now: Date
  onAdvance: (orderId: string, current: OrderStatus, next: OrderStatus) => void
}

const STATUS_CONFIG: Record<
  string,
  { label: string; next: OrderStatus | null; action: string; className: string }
> = {
  pending:    { label: 'New',       next: 'confirmed', action: 'Accept',          className: styles['status-pending']   ?? '' },
  confirmed:  { label: 'Accepted',  next: 'preparing', action: 'Start preparing', className: styles['status-confirmed'] ?? '' },
  preparing:  { label: 'Preparing', next: 'ready',     action: 'Mark ready',      className: styles['status-preparing'] ?? '' },
  ready:      { label: 'Ready',     next: 'paid',      action: 'Complete',        className: styles['status-ready']     ?? '' },
}

function getElapsed(createdAt: string, now: Date): { text: string; urgent: boolean } {
  const mins = Math.floor((now.getTime() - new Date(createdAt).getTime()) / 60000)
  if (mins < 1) return { text: 'Just now', urgent: false }
  if (mins === 1) return { text: '1 min', urgent: false }
  return { text: `${mins} mins`, urgent: mins >= 10 }
}

export function KitchenCard({ order, now, onAdvance }: KitchenCardProps) {
  const config  = STATUS_CONFIG[order.status]
  const elapsed = getElapsed(order.created_at, now)

  return (
    <div className={`${styles.card} ${styles[`card-${order.status}`]}`}>
      <div className={styles.header}>
        <div className={styles.meta}>
          <span className={styles.ref}>{order.order_ref}</span>
          <span className={styles.table}>{order.dining_tables?.label ?? 'Walk-in'}</span>
        </div>
        <div className={styles.right}>
          <span className={`${styles.elapsed} ${elapsed.urgent ? styles['elapsed-urgent'] : ''}`}>
            {elapsed.text}
          </span>
          <span className={`${styles.badge} ${config.className}`}>{config.label}</span>
        </div>
      </div>

      <ul className={styles.items}>
        {order.order_items.map((item) => (
          <li key={item.id} className={styles.item}>
            <span className={styles['item-qty']}>{item.quantity}×</span>
            <div className={styles['item-details']}>
              <span className={styles['item-name']}>{item.product_name}</span>
              {item.modifier_summary && (
                <span className={styles['item-mod']}>{item.modifier_summary}</span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* M-Pesa code — visible to cashier, no need to ask customer */}
      {order.mpesa_receipt && (
        <div className={styles['mpesa-strip']}>
          <span className={styles['mpesa-strip-label']}>M-Pesa</span>
          <span className={styles['mpesa-strip-code']}>{order.mpesa_receipt}</span>
        </div>
      )}

      {config.next && (
        <button
          className={`${styles.action} ${styles[`action-${order.status}`]}`}
          onClick={() => onAdvance(order.id, order.status, config.next!)}
        >
          {config.action}
        </button>
      )}
    </div>
  )
}
