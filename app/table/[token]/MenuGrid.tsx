'use client'

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

// Derive unique categories preserving order
function getCategories(products: Product[]): string[] {
  const seen = new Set<string>()
  const cats: string[] = []
  for (const p of products) {
    const cat = p.category ?? 'Other'
    if (!seen.has(cat)) {
      seen.add(cat)
      cats.push(cat)
    }
  }
  return cats
}

function scrollToCategory(id: string) {
  document.getElementById(`cat-${id}`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
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
        <p className={styles['empty-text']}>No items available right now</p>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      {/* Category tabs */}
      {categories.length > 1 && (
        <div className={styles.tabs}>
          {categories.map((cat) => (
            <button
              key={cat}
              className={styles.tab}
              onClick={() => scrollToCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Product sections */}
      {categories.map((cat) => (
        <section key={cat} id={`cat-${cat}`} className={styles.section}>
          <h2 className={styles['section-title']}>{cat}</h2>
          <div className={styles.grid}>
            {grouped[cat]?.map((product) => {
              const qty = getQuantity(product.id)
              return (
                <div key={product.id} className={styles.card}>
                  <div className={styles['card-body']}>
                    <h3 className={styles['product-name']}>{product.name}</h3>
                    {product.description && (
                      <p className={styles['product-desc']}>
                        {product.description}
                      </p>
                    )}
                    <div className={styles['card-footer']}>
                      <span className={styles['product-price']}>
                        {formatKES(product.price)}
                      </span>

                      {qty === 0 ? (
                        <button
                          className={styles['add-btn']}
                          onClick={() => onAdd(product)}
                          aria-label={`Add ${product.name}`}
                        >
                          <Plus size={18} strokeWidth={2} />
                        </button>
                      ) : (
                        <div className={styles['qty-controls']}>
                          <button
                            className={styles['qty-btn']}
                            onClick={() => onRemove(product.id)}
                            aria-label="Remove one"
                          >
                            <Minus size={14} strokeWidth={2} />
                          </button>
                          <span className={styles['qty-value']}>{qty}</span>
                          <button
                            className={styles['qty-btn']}
                            onClick={() => onAdd(product)}
                            aria-label="Add one"
                          >
                            <Plus size={14} strokeWidth={2} />
                          </button>
                        </div>
                      )}
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
