'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'
import { ProductList } from './ProductList'
import { ProductForm } from './ProductForm'
import type { Product } from '@/lib/types/database.types'
import styles from './page.module.css'

interface MenuClientProps {
  products: Product[]
}

export function MenuClient({ products }: MenuClientProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  function openCreate() {
    setEditingProduct(null)
    setFormOpen(true)
  }

  function openEdit(product: Product) {
    // Empty product means "add first" was clicked from empty state
    if (!product.id) {
      openCreate()
      return
    }
    setEditingProduct(product)
    setFormOpen(true)
  }

  function handleClose() {
    setFormOpen(false)
    setEditingProduct(null)
  }

  return (
    <>
      {/* Page header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Menu</h2>
          <p className={styles.subtitle}>
            {products.length} {products.length === 1 ? 'item' : 'items'}
          </p>
        </div>
        <Button variant="primary" size="md" onClick={openCreate}>
          <Plus size={16} strokeWidth={2} />
          Add product
        </Button>
      </div>

      {/* Product list */}
      <ProductList products={products} onEdit={openEdit} />

      {/* Add / edit modal */}
      <ProductForm
        open={formOpen}
        onClose={handleClose}
        product={editingProduct}
      />
    </>
  )
}
