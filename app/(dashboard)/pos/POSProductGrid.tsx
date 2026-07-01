'use client'

import { useState } from 'react'
import { Search, Plus } from 'lucide-react'
import { formatKES } from '@/lib/utils'
import type { Product } from '@/lib/types/database.types'
import styles from './POSProductGrid.module.css'

interface POSProductGridProps {
  products: Product[]
  onAdd: (product: Product) => void
}

export function POSProductGrid({ products, onAdd }: POSProductGridProps) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const categories = [...new Set(products.map((p) => p.category ?? 'Other'))]

  const filtered = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesCategory =
      !activeCategory || (p.category ?? 'Other') === activeCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className={styles.wrapper}>
      {/* Search */}
      <div className={styles['search-wrap']}>
        <Search size={16} className={styles['search-icon']} strokeWidth={1.5} />
        <input
          type="search"
          className={styles.search}
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
        />
      </div>

      {/* Category filters */}
      {categories.length > 1 && (
        <div className={styles.cats}>
          <button
            className={`${styles.cat} ${!activeCategory ? styles['cat-active'] : ''}`}
            onClick={() => setActiveCategory(null)}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`${styles.cat} ${activeCategory === cat ? styles['cat-active'] : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className={styles.grid}>
        {filtered.map((product) => (
          <button
            key={product.id}
            className={styles.card}
            onClick={() => onAdd(product)}
          >
            <div className={styles['card-inner']}>
              <span className={styles['product-name']}>{product.name}</span>
              {product.category && (
                <span className={styles['product-cat']}>{product.category}</span>
              )}
              <span className={styles['product-price']}>
                {formatKES(product.price)}
              </span>
            </div>
            <span className={styles['add-icon']}>
              <Plus size={16} strokeWidth={2} />
            </span>
          </button>
        ))}

        {filtered.length === 0 && (
          <div className={styles.empty}>
            <p>No products match "{search}"</p>
          </div>
        )}
      </div>
    </div>
  )
}
