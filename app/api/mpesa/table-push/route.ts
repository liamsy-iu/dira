import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  formatKenyanPhone,
  isValidKenyanPhone,
  initiateSTKPush,
} from '@/lib/mpesa'

/**
 * Public M-Pesa STK push for QR table customers.
 * No auth session — security comes from validating that:
 *   1. The order exists
 *   2. The tableToken matches the table the order was placed from
 *   3. The amount comes from the DB, never from the request body
 */
export async function POST(request: NextRequest) {
  let body: { orderId: string; tableToken: string; phone: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { orderId, tableToken, phone } = body

  if (!orderId || !tableToken || !phone) {
    return NextResponse.json(
      { error: 'orderId, tableToken and phone are required.' },
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

  const supabase = createServiceClient()

  // 1. Resolve table token → table
  const { data: table } = await supabase
    .from('dining_tables')
    .select('id, business_id')
    .eq('qr_token', tableToken)
    .single()

  if (!table) {
    return NextResponse.json(
      { error: 'Invalid table. Please scan the QR code again.' },
      { status: 404 }
    )
  }

  // 2. Fetch order — verify it belongs to this table (security check)
  const { data: order } = await supabase
    .from('orders')
    .select('id, order_ref, total, payment_status, table_id, business_id')
    .eq('id', orderId)
    .single()

  if (!order) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
  }

  // Verify order belongs to this table — prevents spoofing other orders
  if (order.table_id !== table.id || order.business_id !== table.business_id) {
    return NextResponse.json({ error: 'Order does not match this table.' }, { status: 403 })
  }

  if (order.payment_status === 'completed') {
    return NextResponse.json({ error: 'This order is already paid.' }, { status: 400 })
  }

  const callbackUrl = process.env.MPESA_CALLBACK_URL
  if (!callbackUrl) {
    return NextResponse.json(
      { error: 'Payment service not configured.' },
      { status: 500 }
    )
  }

  try {
    // 3. Fire STK push — amount comes from DB, never from client
    const result = await initiateSTKPush({
      phone: formattedPhone,
      amountCents: order.total as number,
      orderRef: order.order_ref as string,
      callbackUrl,
    })

    // 4. Record transaction
    await supabase.from('mpesa_transactions').insert({
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
    console.error('[mpesa/table-push]', error)
    return NextResponse.json(
      { error: 'Failed to send M-Pesa prompt. Please try again.' },
      { status: 500 }
    )
  }
}
