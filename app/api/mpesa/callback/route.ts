import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendWhatsAppReceipt } from '@/lib/whatsapp'

/**
 * Safaricom calls this endpoint after the customer enters their PIN.
 * This is a public endpoint — no auth cookie from the browser.
 * We use the service role to write to the DB.
 *
 * Always return { ResultCode: 0, ResultDesc: "Accepted" } so Safaricom
 * doesn't retry. Log errors internally, don't surface them to Safaricom.
 */
export async function POST(request: NextRequest) {
  const OK = NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })

  let body: any
  try {
    body = await request.json()
  } catch {
    return OK // don't let Safaricom see parse errors
  }

  const callback = body?.Body?.stkCallback
  if (!callback) return OK

  const {
    CheckoutRequestID,
    ResultCode,
    ResultDesc,
    CallbackMetadata,
  } = callback

  // Log everything so we can debug production failures
  console.log('[MPESA CALLBACK RECEIVED]', JSON.stringify({
    CheckoutRequestID,
    ResultCode,
    ResultDesc,
    hasMetadata: !!CallbackMetadata,
  }))

  if (!CheckoutRequestID) return OK

  const supabase = createServiceClient()
  const isSuccess = ResultCode === 0

  // Extract receipt number from metadata (only present on success)
  let mpesaReceipt: string | null = null
  if (isSuccess && CallbackMetadata?.Item) {
    const receiptItem = (CallbackMetadata.Item as any[]).find(
      (i) => i.Name === 'MpesaReceiptNumber'
    )
    mpesaReceipt = receiptItem?.Value ?? null
  }

  // 1. Update mpesa_transaction
  const { data: transaction } = await supabase
    .from('mpesa_transactions')
    .update({
      status: isSuccess ? 'completed' : 'failed',
      result_code: ResultCode,
      result_description: ResultDesc,
      mpesa_receipt: mpesaReceipt,
      completed_at: new Date().toISOString(),
    })
    .eq('checkout_request_id', CheckoutRequestID)
    .select('order_id, phone')   // ← phone needed for WhatsApp
    .single()

  if (!transaction?.order_id) return OK

  // 2. Get the current order to determine correct next status
  const { data: currentOrder } = await supabase
    .from('orders')
    .select('status')
    .eq('id', transaction.order_id)
    .single()

  // Payment complete: move to 'confirmed' so kitchen sees it
  // (unless already in kitchen flow — don't regress from preparing/ready)
  const kitchenStatuses = ['preparing', 'ready', 'paid']
  const nextStatus = isSuccess
    ? kitchenStatuses.includes(currentOrder?.status ?? '') ? currentOrder?.status : 'confirmed'
    : currentOrder?.status

  // 2. Update order payment status
  await supabase
    .from('orders')
    .update({
      payment_status: isSuccess ? 'completed' : 'failed',
      ...(isSuccess ? { status: nextStatus, mpesa_receipt: mpesaReceipt } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', transaction.order_id)

  // 3. Send WhatsApp receipt — fire and forget, never blocks payment
  if (isSuccess) {
    const { data: order } = await supabase
      .from('orders')
      .select('order_ref, total, businesses ( name )')
      .eq('id', transaction.order_id)
      .single()

    if (order) {
      const businessName = (order.businesses as any)?.name ?? ''
      const receiptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/receipt/${transaction.order_id}`
      await sendWhatsAppReceipt({
        phone: transaction.phone as string,
        orderRef: order.order_ref as string,
        total: order.total as number,
        businessName,
        receiptUrl,
      }).catch(console.error)
    }
  }

  return OK
}
