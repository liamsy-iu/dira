'use client'

import { useState, useTransition, useMemo } from 'react'
import { placeOrderAction } from '@/lib/actions/orders'
import { MenuGrid } from './MenuGrid'
import { CartDrawer } from './CartDrawer'
import { OrderConfirmation } from './OrderConfirmation'
import { formatKES } from '@/lib/utils'
import type { Product } from '@/lib/types/database.types'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag } from 'lucide-react'
import styles from './TableOrderClient.module.css'

export interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
}

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
  const [isPending, startTransition] = useTransition()

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0)
  const cartTotal = useMemo(
    () => cart.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [cart]
  )

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id)
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
        },
      ]
    })
  }

  function removeFromCart(productId: string) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === productId)
      if (!existing) return prev
      if (existing.quantity === 1) return prev.filter((i) => i.productId !== productId)
      return prev.map((i) =>
        i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i
      )
    })
  }

  function getQuantity(productId: string) {
    return cart.find((i) => i.productId === productId)?.quantity ?? 0
  }

  function handlePlaceOrder() {
    setOrderError(undefined)
    startTransition(async () => {
      const result = await placeOrderAction({
        tableToken: token,
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        paymentMethod: 'cash',
      })

      if ('error' in result && result.error) {
        setOrderError(result.error)
      } else if ('orderRef' in result && result.orderRef) {
        setConfirmedRef(result.orderRef)
        setConfirmedTotal(result.total ?? 0)
        setCartOpen(false)
        setCart([])
      }
    })
  }

  // Show confirmation screen after successful order
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
      {/* Header */}
      <header className={styles.header}>
        <div className={styles['header-inner']}>
          <div>
            <h1 className={styles['business-name']}>{businessName}</h1>
            <p className={styles['table-label']}>{tableLabel}</p>
          </div>
        </div>
      </header>

      {/* Menu */}
      <main className={styles.main}>
        <MenuGrid
          products={products}
          getQuantity={getQuantity}
          onAdd={addToCart}
          onRemove={removeFromCart}
        />
      </main>

      {/* Floating cart button */}
      <AnimatePresence>
        {cartCount > 0 && !cartOpen && (
          <motion.div
            className={styles['cart-bar']}
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <button
              className={styles['cart-btn']}
              onClick={() => setCartOpen(true)}
            >
              <span className={styles['cart-badge']}>
                <ShoppingBag size={18} strokeWidth={1.5} />
                <span className={styles['cart-count']}>{cartCount}</span>
              </span>
              <span>View order</span>
              <span className={styles['cart-total']}>
                {formatKES(totalWithTax)}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart drawer */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        onAdd={(productId) => {
          const product = products.find((p) => p.id === productId)
          if (product) addToCart(product)
        }}
        onRemove={removeFromCart}
        onPlaceOrder={handlePlaceOrder}
        isPending={isPending}
        error={orderError}
      />
    </div>
  )
}
