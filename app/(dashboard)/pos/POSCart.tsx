'use client'

import { useState } from 'react'
import { Minus, Plus, Trash2, CheckCircle2, Loader2, XCircle, Scissors, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { formatKES } from '@/lib/utils'
import type { CartItem } from './POSClient'
import styles from './POSCart.module.css'

export type PaymentState =
  | { status: 'idle' }
  | { status: 'waiting'; orderRef: string; total: number }
  | { status: 'success'; orderId: string; orderRef: string; total: number; receipt?: string }
  | { status: 'failed'; reason: string }

interface POSCartProps {
  cart: CartItem[]
  onAdd: (productId: string) => void
  onRemove: (productId: string) => void
  onClear: () => void
  onPlaceOrder: (paymentMethod: 'cash' | 'mpesa', phone?: string) => void
  onSplit: () => void
  isPending: boolean
  paymentState: PaymentState
}

export function POSCart({
  cart, onAdd, onRemove, onClear, onPlaceOrder, onSplit, isPending, paymentState,
}: POSCartProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa'>('cash')
  const [phone, setPhone] = useState('')

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const tax = Math.round(subtotal * 0.16)
  const total = subtotal + tax

  if (paymentState.status === 'waiting') {
    return (
      <div className={styles.waiting}>
        <Loader2 size={36} className={styles['waiting-icon']} strokeWidth={1.5} />
        <p className={styles['waiting-title']}>Waiting for payment</p>
        <p className={styles['waiting-sub']}>Check your phone and enter your M-Pesa PIN</p>
        <p className={styles['waiting-ref']}>{paymentState.orderRef}</p>
        <p className={styles['waiting-amount']}>{formatKES(paymentState.total)}</p>
      </div>
    )
  }

  if (paymentState.status === 'success') {
    return (
      <div className={styles.success}>
        <CheckCircle2 size={40} strokeWidth={1.5} className={styles['success-icon']} />
        <p className={styles['success-title']}>Payment received</p>
        <p className={styles['success-ref']}>{paymentState.orderRef}</p>
        <p className={styles['success-total']}>{formatKES(paymentState.total)}</p>
        {paymentState.receipt && (
          <p className={styles['success-receipt']}>M-Pesa: {paymentState.receipt}</p>
        )}
        <div className={styles['success-actions']}>
          <Button variant="ghost" size="sm" href={`/receipt/${paymentState.orderId}`}>
            <Receipt size={14} strokeWidth={1.5} /> View receipt
          </Button>
          <Button variant="secondary" size="lg" fullWidth onClick={onClear}>
            New order
          </Button>
        </div>
      </div>
    )
  }

  if (paymentState.status === 'failed') {
    return (
      <div className={styles.failed}>
        <XCircle size={40} strokeWidth={1.5} className={styles['failed-icon']} />
        <p className={styles['failed-title']}>Payment failed</p>
        <p className={styles['failed-reason']}>{paymentState.reason}</p>
        <Button variant="secondary" size="lg" fullWidth onClick={onClear}>Try again</Button>
      </div>
    )
  }

  if (cart.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles['empty-title']}>No items</p>
        <p className={styles['empty-sub']}>Tap products to add them</p>
      </div>
    )
  }

  const canSubmitMpesa = paymentMethod === 'mpesa' && phone.trim().length >= 9

  return (
    <div className={styles.panel}>
      <div className={styles.items}>
        {cart.map((item) => (
          <div key={item.productId} className={styles.item}>
            <div className={styles['item-info']}>
              <span className={styles['item-name']}>{item.name}</span>
              <span className={styles['item-price']}>{formatKES(item.price * item.quantity)}</span>
            </div>
            <div className={styles['item-controls']}>
              <button className={styles['qty-btn']} onClick={() => onRemove(item.productId)} aria-label="Remove">
                {item.quantity === 1 ? <Trash2 size={13} strokeWidth={1.5} /> : <Minus size={13} strokeWidth={2} />}
              </button>
              <span className={styles['qty-val']}>{item.quantity}</span>
              <button className={styles['qty-btn']} onClick={() => onAdd(item.productId)} aria-label="Add">
                <Plus size={13} strokeWidth={2} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.totals}>
        <div className={styles['total-row']}><span>Subtotal</span><span>{formatKES(subtotal)}</span></div>
        <div className={styles['total-row']}><span>VAT 16%</span><span>{formatKES(tax)}</span></div>
        <div className={`${styles['total-row']} ${styles['total-final']}`}><span>Total</span><span>{formatKES(total)}</span></div>
      </div>

      <div className={styles.payment}>
        <span className={styles['payment-label']}>Payment</span>
        <div className={styles['payment-btns']}>
          <button className={`${styles['pay-btn']} ${paymentMethod === 'cash' ? styles['pay-active'] : ''}`} onClick={() => setPaymentMethod('cash')}>Cash</button>
          <button className={`${styles['pay-btn']} ${paymentMethod === 'mpesa' ? styles['pay-active'] : ''}`} onClick={() => setPaymentMethod('mpesa')}>M-Pesa</button>
        </div>
      </div>

      {paymentMethod === 'mpesa' && (
        <div className={styles['phone-wrap']}>
          <Input label="Customer phone" name="phone" type="tel" placeholder="0712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} hint="Kenyan number — they'll get an M-Pesa prompt" mono />
        </div>
      )}

      <div className={styles.actions}>
        <Button variant="primary" size="xl" fullWidth loading={isPending}
          disabled={paymentMethod === 'mpesa' && !canSubmitMpesa}
          onClick={() => onPlaceOrder(paymentMethod, paymentMethod === 'mpesa' ? phone : undefined)}>
          {paymentMethod === 'mpesa' ? `Send M-Pesa prompt · ${formatKES(total)}` : `Charge ${formatKES(total)}`}
        </Button>
        <div className={styles['secondary-actions']}>
          <button className={styles['split-btn']} onClick={onSplit}>
            <Scissors size={14} strokeWidth={1.5} /> Split bill
          </button>
          <button className={styles['clear-btn']} onClick={onClear}>
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}
