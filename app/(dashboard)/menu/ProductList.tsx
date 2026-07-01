'use client'

import { useOptimistic, useTransition, useState } from 'react'
import { Pencil, Trash2, Package } from 'lucide-react'
import {
  toggleAvailabilityAction,
  deleteProductAction,
} from '@/lib/actions/products'
import { Badge, statusToVariant } from '@/components/ui/Badge/Badge'
import { Button } from '@/components/ui/Button/Button'
import { formatKES } from '@/lib/utils'
import type { Product } from '@/lib/types/database.types'
import styles from './ProductList.module.css'

interface ProductListProps {
  products: Product[]
  onEdit: (product: Product) => void
}

// ── Availability toggle ───────────────────────────────────────────────────────
function AvailabilityToggle({
  id,
  isAvailable,
  onToggle,
}: {
  id: string
  isAvailable: boolean
  onToggle: (id: string, next: boolean) => void
}) {
  return (
    <button
      className={`${styles.toggle} ${isAvailable ? styles['toggle-on'] : styles['toggle-off']}`}
      onClick={() => onToggle(id, !isAvailable)}
      aria-label={isAvailable ? 'Mark unavailable' : 'Mark available'}
      title={isAvailable ? 'Available — click to hide' : 'Unavailable — click to show'}
      type="button"
    >
      <span className={styles['toggle-thumb']} />
    </button>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className={styles.empty}>
      <div className={styles['empty-icon']}>
        <Package size={32} strokeWidth={1} />
      </div>
      <h3 className={styles['empty-title']}>No products yet</h3>
      <p className={styles['empty-sub']}>
        Add your first item to start taking orders
      </p>
      <Button variant="primary" size="md" onClick={onAdd}>
        Add first product
      </Button>
    </div>
  )
}

// ── Main list ─────────────────────────────────────────────────────────────────
export function ProductList({ products, onEdit }: ProductListProps) {
  const [, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [optimisticProducts, applyOptimistic] = useOptimistic(
    products,
    (
      state: Product[],
      update: { id: string; is_available: boolean }
    ) =>
      state.map((p) =>
        p.id === update.id ? { ...p, is_available: update.is_available } : p
      )
  )

  function handleToggle(id: string, next: boolean) {
    startTransition(async () => {
      applyOptimistic({ id, is_available: next })
      await toggleAvailabilityAction(id, next)
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this product? This cannot be undone.')) return
    setDeletingId(id)
    await deleteProductAction(id)
    setDeletingId(null)
  }

  // Group by category
  const grouped = optimisticProducts.reduce<Record<string, Product[]>>(
    (acc, product) => {
      const key = product.category ?? 'Uncategorised'
      if (!acc[key]) acc[key] = []
      acc[key].push(product)
      return acc
    },
    {}
  )

  if (products.length === 0) {
    return <EmptyState onAdd={() => onEdit({} as Product)} />
  }

  return (
    <div className={styles.list}>
      {/* Header */}
      <div className={styles.header}>
        <span>Product</span>
        <span>Category</span>
        <span className={styles['col-price']}>Price</span>
        <span className={styles['col-available']}>Available</span>
        <span />
      </div>

      {/* Rows grouped by category */}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className={styles.group}>
          <div className={styles['group-label']}>{category}</div>
          {items.map((product) => (
            <div key={product.id} className={styles.row}>
              <div className={styles['col-name']}>
                <span className={styles.name}>{product.name}</span>
                {product.description && (
                  <span className={styles.description}>
                    {product.description}
                  </span>
                )}
              </div>

              <div className={styles['col-category']}>
                {product.category && (
                  <Badge variant="default">{product.category}</Badge>
                )}
              </div>

              <div className={styles['col-price']}>
                <span className={styles.price}>
                  {formatKES(product.price)}
                </span>
              </div>

              <div className={styles['col-available']}>
                <AvailabilityToggle
                  id={product.id}
                  isAvailable={product.is_available}
                  onToggle={handleToggle}
                />
              </div>

              <div className={styles['col-actions']}>
                <button
                  className={styles['action-btn']}
                  onClick={() => onEdit(product)}
                  aria-label={`Edit ${product.name}`}
                  type="button"
                >
                  <Pencil size={15} strokeWidth={1.5} />
                </button>
                <button
                  className={`${styles['action-btn']} ${styles['action-danger']}`}
                  onClick={() => handleDelete(product.id)}
                  aria-label={`Delete ${product.name}`}
                  disabled={deletingId === product.id}
                  type="button"
                >
                  <Trash2 size={15} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
