/**
 * WhatsApp receipt sender using Twilio's WhatsApp API.
 *
 * Setup:
 * 1. Create a Twilio account at twilio.com
 * 2. Enable WhatsApp in Twilio console → Messaging → Try WhatsApp
 * 3. Set these env vars in Vercel:
 *    TWILIO_ACCOUNT_SID   → from Twilio console dashboard
 *    TWILIO_AUTH_TOKEN    → from Twilio console dashboard
 *    TWILIO_WHATSAPP_FROM → your Twilio WhatsApp number e.g. +14155238886
 *
 * The function is silent (fire-and-forget) — if WhatsApp isn't configured
 * or fails, the payment still completes normally.
 */

export async function sendWhatsAppReceipt({
  phone,
  orderRef,
  total,
  businessName,
  receiptUrl,
}: {
  phone: string
  orderRef: string
  total: number
  businessName: string
  receiptUrl: string
}): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  const from       = process.env.TWILIO_WHATSAPP_FROM

  if (!accountSid || !authToken || !from) {
    console.log('[WhatsApp] Skipped — Twilio env vars not set', {
      hasAccountSid: !!accountSid,
      hasAuthToken: !!authToken,
      hasFrom: !!from,
    })
    return
  }

  const to = `whatsapp:+${phone.replace(/^\+/, '')}`
  const fromFormatted = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`

  const amountKES = (total / 100).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const body = [
    `✅ *Payment received — ${businessName}*`,
    ``,
    `Order: *${orderRef}*`,
    `Amount: *KES ${amountKES}*`,
    ``,
    `View your receipt:`,
    receiptUrl,
  ].join('\n')

  console.log('[WhatsApp] Sending to', to, 'from', fromFormatted)

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      },
      body: new URLSearchParams({ From: fromFormatted, To: to, Body: body }).toString(),
    }
  )

  const result = await res.json()
  console.log('[WhatsApp] Twilio response', res.status, JSON.stringify(result))
}
