'use client'

import { useState, useEffect, useActionState } from 'react'
import { Plus, UtensilsCrossed } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useDiraStore } from '@/lib/store/dira'
import { createProductAction, updateProductAction } from '@/lib/actions/products'
import { Button } from '@/components/ui/Button/Button'
import { Modal } from '@/components/ui/Modal/Modal'
import { Spinner } from '@/components/ui/Spinner/Spinner'
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
    // Refresh products after mutation
    if (businessId) {
      const supabase = createClient()
      supabase
        .from('products').select('*').eq('business_id', businessId)
        .order('category', { ascending: true }).order('sort_order', { ascending: true }).order('name', { ascending: true })
        .then(({ data }) => { if (data) setProducts(data as Product[]) })
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-16)' }}>
        <Spinner size="lg" />
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
