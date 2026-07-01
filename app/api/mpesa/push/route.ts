import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  formatKenyanPhone,
  isValidKenyanPhone,
  initiateSTKPush,
} from '@/lib/mpesa'

export async function POST(request: NextRequest) {
  // Verify authenticated session (POS is owner-only)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  let body: { orderId: string; phone: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { orderId, phone } = body

  if (!orderId || !phone) {
    return NextResponse.json(
      { error: 'orderId and phone are required.' },
      { status: 400 }
    )
  }

  const formattedPhone = formatKenyanPhone(phone)
  if (!isValidKenyanPhone(phone)) {
    return NextResponse.json(
      { error: 'Invalid Kenyan phone number.' },
      { status: 400 }
    )
  }

  const serviceSupabase = createServiceClient()

  // Fetch order — verify it belongs to this owner's business
  const { data: order } = await serviceSupabase
    .from('orders')
    .select('id, order_ref, total, business_id, payment_status')
    .eq('id', orderId)
    .single()

  if (!order) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
  }

  if (order.payment_status === 'completed') {
    return NextResponse.json({ error: 'Order is already paid.' }, { status: 400 })
  }

  // Verify ownership — anon key + RLS handles read, but let's double-check
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!business || business.id !== order.business_id) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 })
  }

  const callbackUrl = process.env.MPESA_CALLBACK_URL
  if (!callbackUrl) {
    return NextResponse.json(
      { error: 'MPESA_CALLBACK_URL is not configured.' },
      { status: 500 }
    )
  }

  try {
    const result = await initiateSTKPush({
      phone: formattedPhone,
      amountCents: order.total,
      orderRef: order.order_ref,
      callbackUrl,
    })

    // Record the transaction
    await serviceSupabase.from('mpesa_transactions').insert({
      order_id: orderId,
      checkout_request_id: result.CheckoutRequestID,
      merchant_request_id: result.MerchantRequestID,
      phone: formattedPhone,
      amount: order.total,
      status: 'pending',
    })

    return NextResponse.json({
      checkoutRequestId: result.CheckoutRequestID,
      customerMessage: result.CustomerMessage,
    })
  } catch (error) {
    console.error('[mpesa/push]', error)
    return NextResponse.json(
      { error: 'Failed to send M-Pesa prompt. Please try again.' },
      { status: 500 }
    )
  }
}
