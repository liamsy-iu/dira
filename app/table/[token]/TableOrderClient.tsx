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
  const [mpesaCode, setMpesaCode] = useState<string | null>(null)
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

    async function checkStatus() {
      const { data } = await supabase
        .from('orders')
        .select('payment_status')
        .eq('id', orderId)
        .single()

      if (data?.payment_status === 'completed') {
        cleanup()
        // Fetch M-Pesa code so customer can show it to cashier
        const { data: tx } = await supabase
          .from('mpesa_transactions')
          .select('mpesa_receipt')
          .eq('order_id', orderId)
          .single()
        setMpesaCode(tx?.mpesa_receipt ?? null)
        setMpesaState({ status: 'idle' })
        setConfirmedRef(orderRef)
        setConfirmedTotal(total)
      } else if (data?.payment_status === 'failed') {
        cleanup()
        setMpesaState({ status: 'failed', reason: 'Payment was cancelled or failed.', orderId, orderRef, total, phone })
      }
    }

    // Realtime — instant on desktop when tab stays active
    const channel = supabase
      .channel(`table-order-payment-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders',
        filter: `id=eq.${orderId}`,
      }, () => checkStatus())
      .subscribe()

    channelRef.current = channel

    // Polling fallback — catches mobile where Realtime drops when tab is backgrounded
    const pollInterval = setInterval(checkStatus, 3000)

    // Page Visibility — fires immediately when customer returns from M-Pesa app
    function handleVisibility() {
      if (!document.hidden) checkStatus()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    // Timeout after 3 minutes
    const timeout = setTimeout(() => {
      cleanup()
      setMpesaState((s) =>
        s.status === 'waiting'
          ? { status: 'failed', reason: 'Payment timed out. Please try again.', orderId, orderRef, total, phone }
          : s
      )
    }, 180000)

    function cleanup() {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      channelRef.current = null
      clearInterval(pollInterval)
      clearTimeout(timeout)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
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
        mpesaCode={mpesaCode}
        onNewOrder={() => { setConfirmedRef(null); setMpesaCode(null) }}
      />
    )
  }

  const totalWithTax = cartTotal // VAT already included in prices

  return (
    <div className={styles.page} data-theme="light">
      <header className={styles.header}>
        <div className={styles['header-inner']}>
          <div className={styles['header-left']}>
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
                <ShoppingBag size={20} strokeWidth={1.5} />
                <motion.span
                  key={cartCount}
                  className={styles['cart-count']}
                  initial={{ scale: 1.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 400 }}
                >
                  {cartCount}
                </motion.span>
              </span>
              <span className={styles['cart-center']}>View order</span>
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
