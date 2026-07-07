'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateOrderRef } from '@/lib/utils'
import type { OrderStatus } from '@/lib/types/database.types'

// Explicit type for Supabase product rows — service client loses type inference
interface DbProduct {
  id: string
  name: string
  price: number
  is_available: boolean
}

// ── Update order status (kitchen display) ─────────────────────────────────────
export async function updateOrderStatusAction(
  orderId: string,
  status: OrderStatus
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)

  if (error) return { error: 'Failed to update order.' }

  revalidatePath('/kitchen')
  return { success: true }
}

// ── Walk-in order (POS) ───────────────────────────────────────────────────────
export async function createWalkInOrderAction(input: {
  items: Array<{ productId: string; quantity: number }>
  paymentMethod: 'cash' | 'mpesa'
  tableId?: string
  phone?: string
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

  // Validate + fetch prices server-side
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
  const tax = Math.round(subtotal * 16 / 116) // VAT included in price
  const total = subtotal // Price already includes VAT
  const orderRef = generateOrderRef()

  // Sequential invoice number per business for TIMS compliance
  const { data: lastInvoice } = await serviceSupabase
    .from('orders')
    .select('invoice_number')
    .eq('business_id', business.id)
    .not('invoice_number', 'is', null)
    .order('invoice_number', { ascending: false })
    .limit(1)
    .single()

  const invoiceNumber = ((lastInvoice?.invoice_number as number | null) ?? 0) + 1

  const { data: order, error: orderError } = await serviceSupabase
    .from('orders')
    .insert({
      business_id: business.id,
      table_id: input.tableId ?? null,
      order_ref: orderRef,
      invoice_number: invoiceNumber,
      status: 'confirmed', // walk-in orders skip pending — staff already know
      payment_method: input.paymentMethod,
      payment_status: 'pending',
      subtotal,
      tax,
      total,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (orderError || !order) return { error: 'Failed to create order.' }

  await serviceSupabase.from('order_items').insert(
    lineItems.map((item) => ({ order_id: order.id, ...item }))
  )

  revalidatePath('/pos')
  revalidatePath('/kitchen')
  return { orderId: order.id, orderRef, total }
}

interface PlaceOrderInput {
  tableToken: string
  items: Array<{ productId: string; quantity: number }>
  paymentMethod: 'cash' | 'mpesa'
  note?: string
}

export async function placeOrderAction(input: PlaceOrderInput) {
  const supabase = createServiceClient()

  // 1. Resolve table token → table + business (server-side, never trust client)
  const { data: table } = await supabase
    .from('dining_tables')
    .select('id, business_id, label')
    .eq('qr_token', input.tableToken)
    .single()

  if (!table) {
    return { error: 'Invalid table. Please scan the QR code again.' }
  }

  if (!input.items.length) {
    return { error: 'Your cart is empty.' }
  }

  // 2. Fetch product prices from DB — never trust amounts from the client
  const productIds = input.items.map((i) => i.productId)

  const { data: productsData2 } = await supabase
    .from('products')
    .select('id, name, price, is_available')
    .in('id', productIds)
    .eq('business_id', table.business_id)

  const products = productsData2 as DbProduct[] | null

  if (!products || products.length !== productIds.length) {
    return { error: 'One or more items could not be found. Please refresh and try again.' }
  }

  const unavailable = products.filter((p) => !p.is_available)
  if (unavailable.length > 0) {
    return {
      error: `These items are currently unavailable: ${unavailable
        .map((p) => p.name)
        .join(', ')}. Please remove them from your cart.`,
    }
  }

  // 3. Compute totals server-side
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
  const tax = Math.round(subtotal * 16 / 116) // VAT included in price // 16% VAT
  const total = subtotal // Price already includes VAT
  const orderRef = generateOrderRef()

  // 4. Create order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      business_id: table.business_id,
      table_id: table.id,
      order_ref: orderRef,
      status: 'pending',
      payment_method: input.paymentMethod,
      payment_status: 'pending',
      subtotal,
      tax,
      total,
      note: input.note ?? null,
    })
    .select('id')
    .single()

  if (orderError || !order) {
    return { error: 'Failed to place order. Please try again.' }
  }

  // 5. Insert order items
  const { error: itemsError } = await supabase.from('order_items').insert(
    lineItems.map((item) => ({ order_id: order.id, ...item }))
  )

  if (itemsError) {
    await supabase.from('orders').delete().eq('id', order.id)
    return { error: 'Failed to place order. Please try again.' }
  }

  // 6. Mark table as occupied
  await supabase
    .from('dining_tables')
    .update({ status: 'occupied' })
    .eq('id', table.id)

  return { orderId: order.id as string, orderRef, total, tableLabel: table.label }
}
