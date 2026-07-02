'use client'

import { useState, useEffect, useActionState } from 'react'
import { Plus, UtensilsCrossed } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useDiraStore } from '@/lib/store/dira'
import { Button } from '@/components/ui/Button/Button'
import { ProductList } from './ProductList'
import { ProductForm } from './ProductForm'
import type { Product } from '@/lib/types/database.types'
import styles from './page.module.css'

export function MenuClient() {
  const businessId = useDiraStore((s) => s.businessId)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  useEffect(() => {
    if (!businessId) return
    const supabase = createClient()
    supabase
      .from('products')
      .select('*')
      .eq('business_id', businessId)
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
      .then(({ data }) => {
        setProducts((data as Product[]) ?? [])
        setLoading(false)
      })
  }, [businessId])

  function openCreate() {
    setEditingProduct(null)
    setFormOpen(true)
  }

  function openEdit(product: Product) {
    if (!product.id) { openCreate(); return }
    setEditingProduct(product)
    setFormOpen(true)
  }

  function handleClose() {
    setFormOpen(false)
    setEditingProduct(null)
    // Refresh local menu state + store (which updates POS in real time)
    if (businessId) {
      const supabase = createClient()
      supabase
        .from('products').select('*').eq('business_id', businessId)
        .order('category', { ascending: true }).order('sort_order', { ascending: true }).order('name', { ascending: true })
        .then(({ data }) => {
          if (data) setProducts(data as Product[])
        })
      // Also update the Zustand store so POS reflects changes immediately
      useDiraStore.getState().refreshProducts()
    }
  }

  const storeProducts = useDiraStore((s) => s.products)

  if (loading) {
    // Content-aware skeleton — show same number of rows as last known product count
    const skeletonCount = storeProducts.length > 0 ? storeProducts.length : 6
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
          <div style={{ width: 120, height: 32, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', animation: 'pulse 1.4s ease-in-out infinite' }} />
          <div style={{ width: 120, height: 40, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', animation: 'pulse 1.4s ease-in-out infinite' }} />
        </div>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <div key={i} style={{ height: 56, borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)', margin: '2px 0', animation: 'pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.05}s` }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Menu</h2>
          <p className={styles.subtitle}>{products.length} {products.length === 1 ? 'item' : 'items'}</p>
        </div>
        <Button variant="primary" size="md" onClick={openCreate}>
          <Plus size={16} strokeWidth={2} />
          Add product
        </Button>
      </div>
      <ProductList products={products} onEdit={openEdit} />
      <ProductForm open={formOpen} onClose={handleClose} product={editingProduct} />
    </>
  )
}
