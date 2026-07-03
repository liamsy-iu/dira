'use client'

import { useRef } from 'react'
import { Plus, Minus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatKES } from '@/lib/utils'
import type { Product } from '@/lib/types/database.types'
import styles from './MenuGrid.module.css'

interface MenuGridProps {
  products: Product[]
  getQuantity: (productId: string) => number
  onAdd: (product: Product) => void
  onRemove: (productId: string) => void
}

function getCategories(products: Product[]): string[] {
  const seen = new Set<string>()
  const cats: string[] = []
  for (const p of products) {
    const cat = p.category ?? 'Other'
    if (!seen.has(cat)) { seen.add(cat); cats.push(cat) }
  }
  return cats
}

function scrollToCategory(id: string) {
  document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function MenuGrid({ products, getQuantity, onAdd, onRemove }: MenuGridProps) {
  const categories = getCategories(products)

  const grouped = products.reduce<Record<string, Product[]>>((acc, p) => {
    const cat = p.category ?? 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {})

  if (products.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No items available right now</p>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      {/* Category tabs */}
      {categories.length > 1 && (
        <div className={styles.tabs}>
          {categories.map((cat) => (
            <button key={cat} className={styles.tab} onClick={() => scrollToCategory(cat)}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Product sections */}
      {categories.map((cat) => (
        <section key={cat} id={`cat-${cat}`} className={styles.section}>
          <h2 className={styles['section-title']}>{cat}</h2>
          <div className={styles.list}>
            {grouped[cat]?.map((product) => {
              const qty = getQuantity(product.id)
              return (
                <div key={product.id} className={styles.card}>
                  <div className={styles['card-body']}>
                    <div className={styles['card-text']}>
                      <h3 className={styles['product-name']}>{product.name}</h3>
                      {product.description && (
                        <p className={styles['product-desc']}>{product.description}</p>
                      )}
                      <span className={styles['product-price']}>{formatKES(product.price)}</span>
                    </div>

                    <div className={styles['card-action']}>
                      <AnimatePresence mode="wait">
                        {qty === 0 ? (
                          <motion.button
                            key="add"
                            className={styles['add-btn']}
                            onClick={() => onAdd(product)}
                            aria-label={`Add ${product.name}`}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            whileTap={{ scale: 0.88 }}
                            transition={{ type: 'spring', damping: 15, stiffness: 400 }}
                          >
                            <Plus size={20} strokeWidth={2.5} />
                          </motion.button>
                        ) : (
                          <motion.div
                            key="controls"
                            className={styles['qty-controls']}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ type: 'spring', damping: 15, stiffness: 400 }}
                          >
                            <button
                              className={styles['qty-btn']}
                              onClick={() => onRemove(product.id)}
                              aria-label="Remove one"
                            >
                              <Minus size={14} strokeWidth={2.5} />
                            </button>
                            <motion.span
                              key={qty}
                              className={styles['qty-value']}
                              initial={{ scale: 1.4 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', damping: 12, stiffness: 400 }}
                            >
                              {qty}
                            </motion.span>
                            <button
                              className={styles['qty-btn']}
                              onClick={() => onAdd(product)}
                              aria-label="Add one"
                            >
                              <Plus size={14} strokeWidth={2.5} />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
