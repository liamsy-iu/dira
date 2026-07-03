'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus } from 'lucide-react'
import { formatKES } from '@/lib/utils'
import type { Product } from '@/lib/types/database.types'
import styles from './MenuGrid.module.css'

interface MenuGridProps {
  products: Product[]
  getQuantity: (productId: string) => number
  onAdd: (product: Product) => void
  onRemove: (productId: string) => void
}

/** Normalize category names so "coffee beans - retail" === "Coffee Beans - Retail" */
function normalizeCategory(cat: string): string {
  return cat.trim().replace(/\b\w/g, (c) => c.toUpperCase())
}

function getCategories(products: Product[]): string[] {
  const seen = new Set<string>()
  const cats: string[] = []
  for (const p of products) {
    const cat = normalizeCategory(p.category ?? 'Other')
    if (!seen.has(cat)) { seen.add(cat); cats.push(cat) }
  }
  return cats
}

const PLACEHOLDER_COLORS = [
  '#fef3c7', '#dcfce7', '#dbeafe',
  '#fce7f3', '#ede9fe', '#ffedd5',
]

function placeholderColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i)
  return PLACEHOLDER_COLORS[hash % PLACEHOLDER_COLORS.length] ?? '#f5f3f0'
}

function scrollToCategory(id: string) {
  document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function MenuGrid({ products, getQuantity, onAdd, onRemove }: MenuGridProps) {
  const categories = getCategories(products)

  const grouped = products.reduce<Record<string, Product[]>>((acc, p) => {
    const cat = normalizeCategory(p.category ?? 'Other')
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {})

  if (products.length === 0) {
    return <div className={styles.empty}><p>No items available right now</p></div>
  }

  return (
    <div className={styles.wrapper}>
      {categories.length > 1 && (
        <div className={styles.tabs}>
          {categories.map((cat) => (
            <button key={cat} className={styles.tab} onClick={() => scrollToCategory(cat)}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {categories.map((cat) => (
        <section key={cat} id={`cat-${cat}`} className={styles.section}>
          <h2 className={styles['section-title']}>{cat}</h2>
          <div className={styles.list}>
            {grouped[cat]?.map((product) => {
              const qty = getQuantity(product.id)
              return (
                <div key={product.id} className={styles.card}>
                  {/* Text side */}
                  <div className={styles['card-text']}>
                    <h3 className={styles['product-name']}>{product.name}</h3>
                    {product.description && (
                      <p className={styles['product-desc']}>{product.description}</p>
                    )}
                    <span className={styles['product-price']}>{formatKES(product.price)}</span>
                  </div>

                  {/* Image + action side */}
                  <div className={styles['card-right']}>
                    <div className={styles['image-wrap']}>
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className={styles['product-image']}
                        />
                      ) : (
                        <div
                          className={styles['product-placeholder']}
                          style={{ backgroundColor: placeholderColor(product.name) }}
                        >
                          <span className={styles['placeholder-letter']}>
                            {product.name[0]?.toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* + / qty controls overlap the image bottom */}
                    <div className={styles['action-wrap']}>
                      <AnimatePresence mode="wait">
                        {qty === 0 ? (
                          <motion.button
                            key="add"
                            className={styles['add-btn']}
                            onClick={() => onAdd(product)}
                            aria-label={`Add ${product.name}`}
                            initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.7, opacity: 0 }}
                            whileTap={{ scale: 0.85 }}
                            transition={{ type: 'spring', damping: 14, stiffness: 400 }}
                          >
                            <Plus size={18} strokeWidth={2.5} />
                          </motion.button>
                        ) : (
                          <motion.div
                            key="controls"
                            className={styles['qty-controls']}
                            initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.7, opacity: 0 }}
                            transition={{ type: 'spring', damping: 14, stiffness: 400 }}
                          >
                            <button className={styles['qty-btn']} onClick={() => onRemove(product.id)} aria-label="Remove one">
                              <Minus size={12} strokeWidth={2.5} />
                            </button>
                            <motion.span
                              key={qty}
                              className={styles['qty-value']}
                              initial={{ scale: 1.5 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', damping: 10, stiffness: 400 }}
                            >
                              {qty}
                            </motion.span>
                            <button className={styles['qty-btn']} onClick={() => onAdd(product)} aria-label="Add one">
                              <Plus size={12} strokeWidth={2.5} />
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
