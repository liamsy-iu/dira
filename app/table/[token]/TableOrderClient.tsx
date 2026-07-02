'use client'

import { useState, useTransition, useMemo, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { placeOrderAction } from '@/lib/actions/orders'
import { MenuGrid } from './MenuGrid'
import { CartDrawer } from './CartDrawer'
import { OrderConfirmation } from './OrderConfirmation'
import { formatKES } from '@/lib/utils'
import type { Product } from '@/lib/types/database.types'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Loader2, XCircle } from 'lucide-react'
import styles from './TableOrderClient.module.css'

export interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
}

type MpesaState =
  | { status: 'idle' }
  | { status: 'waiting'; orderId: string; orderRef: string; total: number; phone: string }
  | { status: 'failed'; reason: string; orderId: string; orderRef: string; total: number; phone: string }

interface TableOrderClientProps {
  token: string
  tableLabel: string
  businessName: string
  products: Product[]
}

export function TableOrderClient({
  token,
  tableLabel,
  businessName,
  products,
}: TableOrderClientProps) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [orderError, setOrderError] = useState<string | undefined>()
  const [confirmedRef, setConfirmedRef] = useState<string | null>(null)
  const [confirmedTotal, setConfirmedTotal] = useState(0)
  const [mpesaState, setMpesaState] = useState<MpesaState>({ status: 'idle' })
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Clean up Realtime channel on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [supabase])

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0)
  const cartTotal = useMemo(
    () => cart.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [cart]
  )

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id)
      if (existing) return prev.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1 }]
    })
  }

  function removeFromCart(productId: string) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === productId)
      if (!existing) return prev
      if (existing.quantity === 1) return prev.filter((i) => i.productId !== productId)
      return prev.map((i) => i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i)
    })
  }

  function getQuantity(productId: string) {
    return cart.find((i) => i.productId === productId)?.quantity ?? 0
  }

  function startMpesaPolling(orderId: string, orderRef: string, total: number, phone: string) {
    setMpesaState({ status: 'waiting', orderId, orderRef, total, phone })
    setCartOpen(false)
    setCart([])

    // Realtime subscription — instant update when callback fires
    const channel = supabase
      .channel(`table-order-payment-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`,
      }, (payload) => {
        const paymentStatus = payload.new.payment_status
        if (paymentStatus === 'completed') {
          supabase.removeChannel(channel)
          channelRef.current = null
          setMpesaState({ status: 'idle' })
          setConfirmedRef(orderRef)
          setConfirmedTotal(total)
        } else if (paymentStatus === 'failed') {
          supabase.removeChannel(channel)
          channelRef.current = null
          setMpesaState({ status: 'failed', reason: 'Payment was cancelled or failed.', orderId, orderRef, total, phone })
        }
      })
      .subscribe()

    channelRef.current = channel

    // Timeout after 2 minutes
    setTimeout(() => {
      if (channelRef.current === channel) {
        supabase.removeChannel(channel)
        channelRef.current = null
        setMpesaState((s) =>
          s.status === 'waiting'
            ? { status: 'failed', reason: 'Payment timed out. Please try again.', orderId, orderRef, total, phone }
            : s
        )
      }
    }, 120000)
  }

  function handlePlaceOrder(paymentMethod: 'cash' | 'mpesa', phone?: string) {
    setOrderError(undefined)
    startTransition(async () => {
      const result = await placeOrderAction({
        tableToken: token,
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        paymentMethod,
      })

      if ('error' in result && result.error) {
        setOrderError(result.error)
        return
      }

      const { orderId, orderRef, total } = result as { orderId: string; orderRef: string; total: number; tableLabel: string }

      if (paymentMethod === 'cash') {
        setConfirmedRef(orderRef)
        setConfirmedTotal(total)
        setCartOpen(false)
        setCart([])
        return
      }

      // M-Pesa: fire STK push then start Realtime polling
      try {
        const pushRes = await fetch('/api/mpesa/table-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, tableToken: token, phone }),
        })

        if (!pushRes.ok) {
          const err = await pushRes.json()
          setOrderError(err.error ?? 'Failed to send M-Pesa prompt.')
          return
        }

        startMpesaPolling(orderId, orderRef, total, phone ?? '')
      } catch {
        setOrderError('Network error. Please try again.')
      }
    })
  }

  async function handleRetryMpesa() {
    if (mpesaState.status !== 'failed') return
    const { orderId, orderRef, total, phone } = mpesaState

    try {
      const pushRes = await fetch('/api/mpesa/table-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, tableToken: token, phone }),
      })

      if (!pushRes.ok) {
        const err = await pushRes.json()
        setMpesaState({ ...mpesaState, reason: err.error ?? 'Failed to resend prompt.' })
        return
      }

      startMpesaPolling(orderId, orderRef, total, phone)
    } catch {
      setMpesaState({ ...mpesaState, reason: 'Network error. Please try again.' })
    }
  }

  // ── M-Pesa waiting screen ─────────────────────────────────────────────────
  if (mpesaState.status === 'waiting') {
    return (
      <div className={styles.page} data-theme="light">
        <motion.div
          className={styles['mpesa-screen']}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Loader2 size={48} className={styles['mpesa-spinner']} strokeWidth={1.5} />
          <h1 className={styles['mpesa-title']}>Check your phone</h1>
          <p className={styles['mpesa-sub']}>
            We sent an M-Pesa prompt to{' '}
            <strong>{mpesaState.phone}</strong>.
            Enter your PIN to complete payment.
          </p>
          <div className={styles['mpesa-detail']}>
            <span>{mpesaState.orderRef}</span>
            <span>{formatKES(mpesaState.total)}</span>
          </div>
          <p className={styles['mpesa-hint']}>
            This screen will update automatically once payment is confirmed.
          </p>
        </motion.div>
      </div>
    )
  }

  // ── M-Pesa failed screen ──────────────────────────────────────────────────
  if (mpesaState.status === 'failed') {
    return (
      <div className={styles.page} data-theme="light">
        <motion.div
          className={styles['mpesa-screen']}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <XCircle size={48} className={styles['mpesa-error-icon']} strokeWidth={1.5} />
          <h1 className={styles['mpesa-title']}>Payment failed</h1>
          <p className={styles['mpesa-sub']}>{mpesaState.reason}</p>
          <div className={styles['mpesa-actions']}>
            <button className={styles['mpesa-retry']} onClick={handleRetryMpesa}>
              Try M-Pesa again
            </button>
            <button
              className={styles['mpesa-cash']}
              onClick={() => {
                setMpesaState({ status: 'idle' })
                setConfirmedRef(mpesaState.orderRef)
                setConfirmedTotal(mpesaState.total)
              }}
            >
              Pay at counter instead
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Confirmation screen ───────────────────────────────────────────────────
  if (confirmedRef) {
    return (
      <OrderConfirmation
        orderRef={confirmedRef}
        total={confirmedTotal}
        tableLabel={tableLabel}
        businessName={businessName}
        onNewOrder={() => setConfirmedRef(null)}
      />
    )
  }

  const totalWithTax = cartTotal + Math.round(cartTotal * 0.16)

  return (
    <div className={styles.page} data-theme="light">
      <header className={styles.header}>
        <div className={styles['header-inner']}>
          <div>
            <h1 className={styles['business-name']}>{businessName}</h1>
            <p className={styles['table-label']}>{tableLabel}</p>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <MenuGrid
          products={products}
          getQuantity={getQuantity}
          onAdd={addToCart}
          onRemove={removeFromCart}
        />
      </main>

      <AnimatePresence>
        {cartCount > 0 && !cartOpen && (
          <motion.div
            className={styles['cart-bar']}
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <button className={styles['cart-btn']} onClick={() => setCartOpen(true)}>
              <span className={styles['cart-badge']}>
                <ShoppingBag size={18} strokeWidth={1.5} />
                <span className={styles['cart-count']}>{cartCount}</span>
              </span>
              <span>View order</span>
              <span className={styles['cart-total']}>{formatKES(totalWithTax)}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        onAdd={(productId) => { const p = products.find((p) => p.id === productId); if (p) addToCart(p) }}
        onRemove={removeFromCart}
        onPlaceOrder={handlePlaceOrder}
        isPending={isPending}
        error={orderError}
      />
    </div>
  )
}
