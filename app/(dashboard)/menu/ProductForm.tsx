'use client'

import { useActionState, useEffect } from 'react'
import { createProductAction, updateProductAction } from '@/lib/actions/products'
import { Modal } from '@/components/ui/Modal/Modal'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { centsToKes } from '@/lib/utils'
import type { Product } from '@/lib/types/database.types'
import styles from './ProductForm.module.css'

interface ProductFormProps {
  open: boolean
  onClose: () => void
  product?: Product | null  // null = create mode, Product = edit mode
}

const CATEGORY_SUGGESTIONS = [
  'Coffee', 'Tea', 'Cold Drinks', 'Food', 'Pastries',
  'Snacks', 'Desserts', 'Breakfast', 'Lunch', 'Specials',
]

const initialState = { error: undefined as string | undefined, success: false }

export function ProductForm({ open, onClose, product }: ProductFormProps) {
  const isEdit = !!product

  const action = isEdit ? updateProductAction : createProductAction

  const [state, formAction, isPending] = useActionState(action, initialState)

  // Close modal on success
  useEffect(() => {
    if (state?.success) onClose()
  }, [state?.success, onClose])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit product' : 'Add product'}
      size="md"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            form="product-form"
            loading={isPending}
          >
            {isEdit ? 'Save changes' : 'Add product'}
          </Button>
        </>
      }
    >
      <form id="product-form" action={formAction} className={styles.form}>
        {/* Hidden id for edit mode */}
        {isEdit && <input type="hidden" name="id" value={product.id} />}

        {state?.error && (
          <div className={styles['error-banner']} role="alert">
            {state.error}
          </div>
        )}

        <Input
          label="Product name"
          name="name"
          type="text"
          placeholder="Flat white"
          defaultValue={product?.name ?? ''}
          required
        />

        <div className={styles.row}>
          <Input
            label="Price (KES)"
            name="price"
            type="number"
            placeholder="450"
            defaultValue={product ? centsToKes(product.price) : ''}
            min="1"
            step="0.01"
            mono
            required
          />

          <div className={styles.field}>
            <label htmlFor="category" className={styles.label}>
              Category
            </label>
            <input
              id="category"
              name="category"
              type="text"
              list="category-list"
              placeholder="Coffee"
              defaultValue={product?.category ?? ''}
              className={styles.input}
              autoComplete="off"
            />
            <datalist id="category-list">
              {CATEGORY_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="description" className={styles.label}>
            Description
            <span className={styles.optional}> — optional</span>
          </label>
          <textarea
            id="description"
            name="description"
            placeholder="A short, clear description for the QR menu"
            defaultValue={product?.description ?? ''}
            className={styles.textarea}
            rows={3}
          />
        </div>

        <Input
          label="Stock count"
          name="stock_count"
          type="number"
          placeholder="Leave empty for unlimited"
          defaultValue={product?.stock_count ?? ''}
          min="0"
          step="1"
          hint="Leave empty if you don't track stock for this item"
        />
      </form>
    </Modal>
  )
}
