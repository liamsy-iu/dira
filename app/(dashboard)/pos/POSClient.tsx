'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createWalkInOrderAction } from '@/lib/actions/orders'
import { POSProductGrid } from './POSProductGrid'
import { POSCart, type PaymentState } from './POSCart'
import { SplitBillModal } from './SplitBillModal'
import type { Product } from '@/lib/types/database.types'
import styles from './page.module.css'

export interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
}

export function POSClient({ products }: { products: Product[] }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentState, setPaymentState] = useState<PaymentState>({ status: 'idle' })
  const [splitOpen, setSplitOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

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

  function clearCart() {
    setCart([])
    setPaymentState({ status: 'idle' })
    if (pollRef.current) clearInterval(pollRef.current)
  }

  function startMpesaPolling(orderId: string, orderRef: string, total: number) {
    setPaymentState({ status: 'waiting', orderRef, total })

    const channel = supabase
      .channel(`order-payment-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`,
      }, async (payload) => {
        const paymentStatus = payload.new.payment_status
        if (paymentStatus === 'completed') {
          supabase.removeChannel(channel)
          const { data: tx } = await supabase
            .from('mpesa_transactions')
            .select('mpesa_receipt')
            .eq('order_id', orderId)
            .single()
          setPaymentState({ status: 'success', orderId, orderRef, total, receipt: tx?.mpesa_receipt ?? undefined })
        } else if (paymentStatus === 'failed') {
          supabase.removeChannel(channel)
          setPaymentState({ status: 'failed', reason: 'M-Pesa payment was cancelled or failed.' })
        }
      })
      .subscribe()

    setTimeout(() => {
      supabase.removeChannel(channel)
      setPaymentState((s) =>
        s.status === 'waiting' ? { status: 'failed', reason: 'Payment timed out. Please try again.' } : s
      )
    }, 120000)
  }

  function handlePlaceOrder(paymentMethod: 'cash' | 'mpesa', phone?: string) {
    startTransition(async () => {
      const result = await createWalkInOrderAction({
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        paymentMethod,
      })

      if ('error' in result) return

      const { orderId, orderRef, total } = result
      setCart([])

      if (paymentMethod === 'cash') {
        setPaymentState({ status: 'success', orderId, orderRef, total })
        return
      }

      try {
        const pushRes = await fetch('/api/mpesa/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, phone }),
        })
        if (!pushRes.ok) {
          const err = await pushRes.json()
          setPaymentState({ status: 'failed', reason: err.error ?? 'Failed to send M-Pesa prompt.' })
          return
        }
        startMpesaPolling(orderId, orderRef, total)
      } catch {
        setPaymentState({ status: 'failed', reason: 'Network error. Please check your connection.' })
      }
    })
  }

  return (
    <>
      <div className={styles.pos}>
        <div className={styles.left}>
          <POSProductGrid products={products} onAdd={addToCart} />
        </div>
        <div className={styles.right}>
          <div className={styles['cart-header']}>
            <span className={styles['cart-title']}>Current order</span>
            {cart.length > 0 && (
              <span className={styles['cart-count']}>
                {cart.reduce((s, i) => s + i.quantity, 0)} items
              </span>
            )}
          </div>
          <div className={styles['cart-body']}>
            <POSCart
              cart={cart}
              onAdd={(id) => { const p = products.find((p) => p.id === id); if (p) addToCart(p) }}
              onRemove={removeFromCart}
              onClear={clearCart}
              onPlaceOrder={handlePlaceOrder}
              onSplit={() => setSplitOpen(true)}
              isPending={isPending}
              paymentState={paymentState}
            />
          </div>
        </div>
      </div>

      <SplitBillModal
        open={splitOpen}
        onClose={() => setSplitOpen(false)}
        onComplete={clearCart}
        cart={cart}
      />
    </>
  )
}
