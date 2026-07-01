'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateOrderRef } from '@/lib/utils'

// Explicit type for Supabase product rows — service client loses type inference
interface DbProduct {
  id: string
  name: string
  price: number
  is_available: boolean
}

export interface SplitEntry {
  index: number
  amount: number // in cents
  paid: boolean
}

/**
 * Creates ONE kitchen order from the cart, returns N equal split amounts.
 * Payments are collected manually by the cashier per split — no automated tracking.
 * When all splits are confirmed by cashier, call markOrderPaidAction.
 */
export async function createSplitOrderAction(input: {
  items: Array<{ productId: string; quantity: number }>
  splitCount: number
  tableId?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!business) return { error: 'Business not found.' }
  if (!input.items.length) return { error: 'Cart is empty.' }
  if (input.splitCount < 2) return { error: 'Split count must be at least 2.' }

  const serviceSupabase = createServiceClient()
  const productIds = input.items.map((i) => i.productId)

  const { data: productsData } = await serviceSupabase
    .from('products')
    .select('id, name, price, is_available')
    .in('id', productIds)
    .eq('business_id', business.id)

  const products = productsData as DbProduct[] | null

  if (!products || products.length !== productIds.length) {
    return { error: 'One or more products not found.' }
  }

  const lineItems = input.items.map((item) => {
    const product = products.find((p: DbProduct) => p.id === item.productId)!
    return {
      product_id: item.productId,
      product_name: product.name,
      unit_price: product.price,
      quantity: item.quantity,
      subtotal: product.price * item.quantity,
      modifier_summary: null,
    }
  })

  const subtotal = lineItems.reduce((sum, i) => sum + i.subtotal, 0)
  const tax = Math.round(subtotal * 0.16)
  const total = subtotal + tax

  // Compute splits — last person gets the remainder to avoid rounding gaps
  const baseAmount = Math.floor(total / input.splitCount)
  const remainder = total - baseAmount * (input.splitCount - 1)

  const splits: SplitEntry[] = Array.from({ length: input.splitCount }, (_, i) => ({
    index: i,
    amount: i === input.splitCount - 1 ? remainder : baseAmount,
    paid: false,
  }))

  // Get next invoice number for this business
  const { data: lastInvoice } = await serviceSupabase
    .from('orders')
    .select('invoice_number')
    .eq('business_id', business.id)
    .not('invoice_number', 'is', null)
    .order('invoice_number', { ascending: false })
    .limit(1)
    .single()

  const invoiceNumber = ((lastInvoice?.invoice_number as number | null) ?? 0) + 1
  const orderRef = generateOrderRef()

  const { data: order, error: orderError } = await serviceSupabase
    .from('orders')
    .insert({
      business_id: business.id,
      table_id: input.tableId ?? null,
      order_ref: orderRef,
      invoice_number: invoiceNumber,
      status: 'confirmed',
      payment_method: 'cash',
      payment_status: 'pending',
      subtotal,
      tax,
      total,
      note: `Split × ${input.splitCount}`,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (orderError || !order) return { error: 'Failed to create order.' }

  await serviceSupabase.from('order_items').insert(
    lineItems.map((item) => ({ order_id: order.id, ...item }))
  )

  revalidatePath('/kitchen')

  return {
    orderId: order.id,
    orderRef,
    invoiceNumber,
    total,
    splits,
  }
}

/**
 * Mark the split order as fully paid after all splits collected.
 */
export async function markOrderPaidAction(orderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('orders')
    .update({
      payment_status: 'completed',
      status: 'paid',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (error) return { error: 'Failed to complete payment.' }

  revalidatePath('/kitchen')
  revalidatePath('/reports')
  return { success: true }
}
