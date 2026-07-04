/**
 * Dira — Safaricom Daraja API utilities
 * All M-Pesa operations go through here.
 * Only ever called server-side (Route Handlers, Server Actions).
 */

const IS_PRODUCTION = process.env.MPESA_ENV === 'production'

const DARAJA_BASE = IS_PRODUCTION
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke'

/**
 * Format a Kenyan phone number to the 254XXXXXXXXX format Daraja requires.
 * Handles: 0712345678, +254712345678, 254712345678, 712345678
 */
export function formatKenyanPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('254') && cleaned.length === 12) return cleaned
  if (cleaned.startsWith('0') && cleaned.length === 10) return '254' + cleaned.slice(1)
  if ((cleaned.startsWith('7') || cleaned.startsWith('1')) && cleaned.length === 9)
    return '254' + cleaned
  return cleaned
}

export function isValidKenyanPhone(phone: string): boolean {
  const formatted = formatKenyanPhone(phone)
  return /^254[71]\d{8}$/.test(formatted)
}

/**
 * Generate the Daraja password and timestamp.
 * Password = base64(shortcode + passkey + timestamp)
 */
export function generateDarajaPassword(): { password: string; timestamp: string } {
  const shortcode = process.env.MPESA_SHORTCODE!
  const passkey = process.env.MPESA_PASSKEY!
  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, '')
    .slice(0, 14)
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString(
    'base64'
  )
  return { password, timestamp }
}

/**
 * Get a fresh OAuth token from Daraja.
 * Tokens expire after 1 hour — don't cache them longer.
 */
export async function getDarajaToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64')

  const res = await fetch(
    `${DARAJA_BASE}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: { Authorization: `Basic ${credentials}` },
      cache: 'no-store',
    }
  )

  if (!res.ok) {
    const text = await res.text()
    console.error('[Daraja token failed]', {
      status: res.status,
      body: text,
      env: process.env.MPESA_ENV,
    })
    throw new Error(`Daraja token error: ${text}`)
  }

  const data = await res.json()
  return data.access_token as string
}

export interface STKPushResult {
  MerchantRequestID: string
  CheckoutRequestID: string
  ResponseCode: string
  ResponseDescription: string
  CustomerMessage: string
}

/**
 * Initiate an M-Pesa STK push.
 * Amount is in cents — we convert to whole KES (round up).
 */
export async function initiateSTKPush({
  phone,
  amountCents,
  orderRef,
  callbackUrl,
}: {
  phone: string
  amountCents: number
  orderRef: string
  callbackUrl: string
}): Promise<STKPushResult> {
  const token = await getDarajaToken()
  const { password, timestamp } = generateDarajaPassword()
  const shortcode = process.env.MPESA_SHORTCODE!
  // For Till (Buy Goods): PartyB is the Till number
  // For PayBill: PartyB equals the shortcode
  const partyB = process.env.MPESA_TILL_NUMBER ?? shortcode
  const amountKES = Math.ceil(amountCents / 100)

  const res = await fetch(`${DARAJA_BASE}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: process.env.MPESA_TRANSACTION_TYPE ?? 'CustomerPayBillOnline',
      Amount: amountKES,
      PartyA: phone,
      PartyB: partyB,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: orderRef,
      TransactionDesc: `Dira ${orderRef}`,
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('[Daraja STK Push failed]', {
      status: res.status,
      body: text,
      phone,
      amountKES,
      orderRef,
      env: process.env.MPESA_ENV,
      shortcode: process.env.MPESA_SHORTCODE,
    })
    throw new Error(`STK push error ${res.status}: ${text}`)
  }

  return (await res.json()) as STKPushResult
}
