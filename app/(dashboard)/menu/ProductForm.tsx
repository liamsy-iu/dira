'use client'

import { useActionState, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ImageIcon, X } from 'lucide-react'
import { createProductAction, updateProductAction } from '@/lib/actions/products'
import { Modal } from '@/components/ui/Modal/Modal'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { centsToKes } from '@/lib/utils'
import type { Product } from '@/lib/types/database.types'
import styles from './ProductForm.module.css'

const CATEGORY_SUGGESTIONS = [
  'Coffee', 'Tea', 'Cold Drinks', 'Food', 'Pastries',
  'Snacks', 'Desserts', 'Breakfast', 'Lunch', 'Specials',
]

const initialState = { error: undefined as string | undefined, success: false }

interface ProductFormProps {
  open: boolean
  onClose: () => void
  product?: Product | null
}

export function ProductForm({ open, onClose, product }: ProductFormProps) {
  const isEdit = !!product
  const action = isEdit ? updateProductAction : createProductAction
  const [state, formAction, isPending] = useActionState(action, initialState)

  const [imageUrl, setImageUrl] = useState(product?.image_url ?? '')
  const [uploading, setUploading] = useState(false)

  // Reset image when product changes
  useEffect(() => {
    setImageUrl(product?.image_url ?? '')
  }, [product])

  useEffect(() => {
    if (state?.success) onClose()
  }, [state?.success, onClose])

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate size (max 2MB) and type
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be under 2MB')
      return
    }

    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `products/${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, file, { upsert: true })

    if (!error) {
      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(path)
      setImageUrl(data.publicUrl)
    }
    setUploading(false)
  }

  function removeImage() {
    setImageUrl('')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit product' : 'Add product'}
      size="md"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose} type="button">Cancel</Button>
          <Button variant="primary" size="md" type="submit" form="product-form" loading={isPending || uploading}>
            {isEdit ? 'Save changes' : 'Add product'}
          </Button>
        </>
      }
    >
      <form id="product-form" action={formAction} className={styles.form}>
        {isEdit && <input type="hidden" name="id" value={product.id} />}
        <input type="hidden" name="image_url" value={imageUrl} />

        {state?.error && (
          <div className={styles['error-banner']} role="alert">{state.error}</div>
        )}

        {/* Image upload */}
        <div className={styles['image-section']}>
          {imageUrl ? (
            <div className={styles['image-preview']}>
              <img src={imageUrl} alt="Product" className={styles['preview-img']} />
              <button type="button" className={styles['remove-image']} onClick={removeImage} aria-label="Remove image">
                <X size={14} strokeWidth={2} />
              </button>
            </div>
          ) : (
            <label className={`${styles['upload-area']} ${uploading ? styles.uploading : ''}`}>
              <input type="file" accept="image/*" onChange={handleImageChange} className={styles['file-input']} disabled={uploading} />
              <ImageIcon size={24} strokeWidth={1.5} className={styles['upload-icon']} />
              <span className={styles['upload-label']}>
                {uploading ? 'Uploading…' : 'Add photo'}
              </span>
              <span className={styles['upload-hint']}>JPG, PNG or WEBP · Max 2MB</span>
            </label>
          )}
        </div>

        <Input label="Product name" name="name" type="text" placeholder="Flat white" defaultValue={product?.name ?? ''} required />

        <div className={styles.row}>
          <Input label="Price (KES)" name="price" type="number" placeholder="450" defaultValue={product ? centsToKes(product.price) : ''} min="1" step="0.01" mono required />

          <div className={styles.field}>
            <label htmlFor="category" className={styles.label}>Category</label>
            <input id="category" name="category" type="text" list="category-list" placeholder="Coffee" defaultValue={product?.category ?? ''} className={styles.input} autoComplete="off" />
            <datalist id="category-list">
              {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="description" className={styles.label}>
            Description <span className={styles.optional}>— optional</span>
          </label>
          <textarea id="description" name="description" placeholder="A short description for the QR menu" defaultValue={product?.description ?? ''} className={styles.textarea} rows={3} />
        </div>

        <Input label="Stock count" name="stock_count" type="number" placeholder="Leave empty for unlimited" defaultValue={product?.stock_count ?? ''} min="0" step="1" hint="Leave empty if you don't track stock for this item" />
      </form>
    </Modal>
  )
}
