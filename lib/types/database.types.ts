/**
 * Mauzo POS — Database Types
 *
 * These mirror the Supabase Postgres schema exactly.
 * When the schema changes, regenerate with:
 *   npx supabase gen types typescript --project-id <id> > lib/types/database.types.ts
 *
 * The discriminated unions below (OrderStatus, PaymentMethod, etc.)
 * are the source of truth for status rendering across the whole app.
 */

/* ── Status enums ─────────────────────────── */

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'paid'
  | 'cancelled'

export type PaymentMethod = 'cash' | 'mpesa' | 'card'

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled'

export type UserRole = 'owner' | 'cashier' | 'kitchen'

export type TableStatus = 'available' | 'occupied' | 'reserved'

/* ── Row types ────────────────────────────── */

export interface Business {
  id: string
  owner_id: string
  name: string
  phone: string | null
  email: string | null
  kra_pin: string | null
  logo_url: string | null
  currency: string       // 'KES' default
  timezone: string       // 'Africa/Nairobi' default
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  business_id: string
  name: string
  description: string | null
  price: number          // stored in lowest unit (cents/smallest KES unit)
  category: string | null
  image_url: string | null
  is_available: boolean
  stock_count: number | null  // null = unlimited
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ProductModifier {
  id: string
  product_id: string
  name: string           // e.g. "Milk type"
  required: boolean
  max_selections: number // 1 = single choice, n = multi
  created_at: string
}

export interface ModifierOption {
  id: string
  modifier_id: string
  label: string          // e.g. "Oat milk"
  price_delta: number    // 0 = no extra charge, positive = add-on cost
  is_default: boolean
  sort_order: number
}

export interface DiningTable {
  id: string
  business_id: string
  label: string          // e.g. "Table 4", "Counter"
  status: TableStatus
  qr_token: string       // opaque short token used in QR URL, not owner_id
  created_at: string
}

export interface Order {
  id: string
  business_id: string
  table_id: string | null
  order_ref: string      // server-generated, e.g. MZP-7X3K
  status: OrderStatus
  payment_method: PaymentMethod | null
  payment_status: PaymentStatus
  subtotal: number       // computed server-side from items, never trusted from client
  tax: number
  total: number
  note: string | null
  created_by: string | null  // staff user id, null = customer self-order
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string   // snapshot at time of order (product may change later)
  unit_price: number     // snapshot
  quantity: number
  modifier_summary: string | null  // e.g. "Oat milk, No sugar"
  subtotal: number
}

export interface MpesaTransaction {
  id: string
  order_id: string | null
  subscription_id: string | null
  checkout_request_id: string  // Daraja idempotency key
  phone: string
  amount: number
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  result_code: number | null
  result_description: string | null
  mpesa_receipt: string | null
  initiated_at: string
  completed_at: string | null
}

export interface Subscription {
  id: string
  business_id: string
  status: SubscriptionStatus
  trial_ends_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  amount: number         // KES per period
  created_at: string
  updated_at: string
}

export interface StaffMember {
  id: string
  business_id: string
  user_id: string
  role: UserRole
  name: string
  pin: string | null     // 4-digit PIN for quick cashier login
  created_at: string
}

/* ── API payload types ────────────────────── */

/** Shape the customer QR app sends when placing an order */
export interface PlaceOrderPayload {
  table_token: string    // resolved server-side to a table + business
  items: Array<{
    product_id: string
    quantity: number
    modifier_option_ids: string[]
  }>
  note?: string
  payment_method: PaymentMethod
  phone?: string         // required when payment_method === 'mpesa'
}

/** Shape the POS sends for a walk-in order */
export interface WalkInOrderPayload {
  items: Array<{
    product_id: string
    quantity: number
    modifier_option_ids: string[]
  }>
  payment_method: PaymentMethod
  phone?: string
  table_id?: string
  note?: string
}

/** M-Pesa STK push response shape from Daraja */
export interface DarajaSTKResponse {
  MerchantRequestID: string
  CheckoutRequestID: string
  ResponseCode: string
  ResponseDescription: string
  CustomerMessage: string
}

/** M-Pesa STK callback body from Safaricom */
export interface DarajaCallback {
  Body: {
    stkCallback: {
      MerchantRequestID: string
      CheckoutRequestID: string
      ResultCode: number
      ResultDesc: string
      CallbackMetadata?: {
        Item: Array<{
          Name: string
          Value: string | number
        }>
      }
    }
  }
}
