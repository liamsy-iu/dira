'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'
import { formatKES } from '@/lib/utils'
import type { CartItem } from './TableOrderClient'
import styles from './CartDrawer.module.css'

interface CartDrawerProps {
  open: boolean
  onClose: () => void
  cart: CartItem[]
  onAdd: (productId: string) => void
  onRemove: (productId: string) => void
  onPlaceOrder: () => void
  isPending: boolean
  error?: string
}

export function CartDrawer({
  open,
  onClose,
  cart,
  onAdd,
  onRemove,
  onPlaceOrder,
  isPending,
  error,
}: CartDrawerProps) {
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const tax = Math.round(subtotal * 0.16)
  const total = subtotal + tax

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className={styles.drawer}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Handle bar */}
            <div className={styles.handle} aria-hidden="true" />

            {/* Header */}
            <div className={styles.header}>
              <h2 className={styles.title}>Your order</h2>
              <button
                className={styles.close}
                onClick={onClose}
                aria-label="Close cart"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            {/* Items */}
            <div className={styles.items}>
              {cart.map((item) => (
                <div key={item.productId} className={styles.item}>
                  <div className={styles['item-left']}>
                    <span className={styles['item-name']}>{item.name}</span>
                    <span className={styles['item-subtotal']}>
                      {formatKES(item.price * item.quantity)}
                    </span>
                  </div>
                  <div className={styles['item-qty']}>
                    <button
                      className={styles['qty-btn']}
                      onClick={() => onRemove(item.productId)}
                      aria-label={`Remove ${item.name}`}
                    >
                      <Minus size={13} strokeWidth={2} />
                    </button>
                    <span className={styles['qty-value']}>{item.quantity}</span>
                    <button
                      className={styles['qty-btn']}
                      onClick={() => onAdd(item.productId)}
                      aria-label={`Add ${item.name}`}
                    >
                      <Plus size={13} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className={styles.totals}>
              <div className={styles['total-row']}>
                <span>Subtotal</span>
                <span>{formatKES(subtotal)}</span>
              </div>
              <div className={styles['total-row']}>
                <span>VAT (16%)</span>
                <span>{formatKES(tax)}</span>
              </div>
              <div className={`${styles['total-row']} ${styles['total-final']}`}>
                <span>Total</span>
                <span>{formatKES(total)}</span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className={styles.error} role="alert">
                {error}
              </div>
            )}

            {/* CTA */}
            <div className={styles.footer}>
              <Button
                variant="primary"
                size="xl"
                fullWidth
                loading={isPending}
                onClick={onPlaceOrder}
              >
                {isPending ? 'Placing order…' : `Place order · ${formatKES(total)}`}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
