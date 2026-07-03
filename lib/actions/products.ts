'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { kesToCents } from '@/lib/utils'

// Consistent state shape for all product form actions
type ProductState = { error: string | undefined; success: boolean }

async function getBusinessId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, businessId: null }
  const { data: business } = await supabase
    .from('businesses').select('id').eq('owner_id', user.id).single()
  return { supabase, businessId: business?.id ?? null }
}

export async function createProductAction(
  _prev: ProductState,
  formData: FormData
): Promise<ProductState> {
  const { supabase, businessId } = await getBusinessId()
  if (!businessId) return { error: 'Not authenticated.', success: false }

  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim()
  const priceStr = formData.get('price') as string
  const category = (formData.get('category') as string)?.trim()
  const stockStr = formData.get('stock_count') as string

  if (!name) return { error: 'Product name is required.', success: false }

  const price = parseFloat(priceStr)
  if (isNaN(price) || price <= 0)
    return { error: 'Price must be a positive number.', success: false }

  const { error } = await supabase.from('products').insert({
    business_id: businessId,
    name,
    description: description || null,
    price: kesToCents(price),
    category: category || null,
    image_url: (formData.get('image_url') as string)?.trim() || null,
    stock_count: stockStr ? parseInt(stockStr) : null,
    is_available: true,
    sort_order: 0,
  })

  if (error) return { error: 'Failed to save product. Please try again.', success: false }

  revalidatePath('/menu')
  return { error: undefined, success: true }
}

export async function updateProductAction(
  _prev: ProductState,
  formData: FormData
): Promise<ProductState> {
  const { supabase, businessId } = await getBusinessId()
  if (!businessId) return { error: 'Not authenticated.', success: false }

  const id = formData.get('id') as string
  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim()
  const priceStr = formData.get('price') as string
  const category = (formData.get('category') as string)?.trim()
  const stockStr = formData.get('stock_count') as string

  if (!id) return { error: 'Product ID missing.', success: false }
  if (!name) return { error: 'Product name is required.', success: false }

  const price = parseFloat(priceStr)
  if (isNaN(price) || price <= 0)
    return { error: 'Price must be a positive number.', success: false }

  const { error } = await supabase
    .from('products')
    .update({
      name,
      description: description || null,
      price: kesToCents(price),
      category: category || null,
      image_url: (formData.get('image_url') as string)?.trim() || null,
      stock_count: stockStr ? parseInt(stockStr) : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('business_id', businessId)

  if (error) return { error: 'Failed to update product. Please try again.', success: false }

  revalidatePath('/menu')
  return { error: undefined, success: true }
}

export async function toggleAvailabilityAction(id: string, isAvailable: boolean) {
  const { supabase, businessId } = await getBusinessId()
  if (!businessId) return { error: 'Not authenticated.' }
  const { error } = await supabase
    .from('products')
    .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
    .eq('id', id).eq('business_id', businessId)
  if (error) return { error: 'Failed to update availability.' }
  revalidatePath('/menu')
  return { success: true }
}

export async function deleteProductAction(id: string) {
  const { supabase, businessId } = await getBusinessId()
  if (!businessId) return { error: 'Not authenticated.' }
  const { error } = await supabase
    .from('products').delete().eq('id', id).eq('business_id', businessId)
  if (error) return { error: 'Failed to delete product.' }
  revalidatePath('/menu')
  return { success: true }
}
