import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

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
    .select('order_id')
    .single()

  if (!transaction?.order_id) return OK

  // 2. Update order payment status
  await supabase
    .from('orders')
    .update({
      payment_status: isSuccess ? 'completed' : 'failed',
      ...(isSuccess ? { status: 'paid' } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', transaction.order_id)

  return OK
}
