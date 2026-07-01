import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatKES } from '@/lib/utils'
import { PrintReceiptButton } from './PrintReceiptButton'
import styles from './page.module.css'

interface PageProps {
  params: Promise<{ orderId: string }>
}

export default async function ReceiptPage({ params }: PageProps) {
  const { orderId } = await params
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('orders')
    .select(`
      id, order_ref, invoice_number, status, payment_method,
      payment_status, subtotal, tax, total, note, created_at,
      dining_tables ( label ),
      order_items ( product_name, quantity, unit_price, subtotal ),
      businesses ( name, phone, email, kra_pin, address )
    `)
    .eq('id', orderId)
    .single()

  if (!order) notFound()

  const business = order.businesses as any
  const items = (order.order_items as any[]) ?? []
  const date = new Date(order.created_at)

  const invoiceLabel = order.invoice_number
    ? `INV-${String(order.invoice_number).padStart(5, '0')}`
    : order.order_ref

  return (
    <div className={styles.page}>
      <div className={styles.receipt}>
        {/* Business header */}
        <div className={styles.header}>
          <h1 className={styles['business-name']}>{business?.name}</h1>
          {business?.address && (
            <p className={styles['business-detail']}>{business.address}</p>
          )}
          {business?.phone && (
            <p className={styles['business-detail']}>{business.phone}</p>
          )}
          {business?.email && (
            <p className={styles['business-detail']}>{business.email}</p>
          )}
          {business?.kra_pin && (
            <p className={styles['kra-pin']}>
              KRA PIN: {business.kra_pin}
            </p>
          )}
        </div>

        <div className={styles.divider} />

        {/* Receipt details */}
        <div className={styles.meta}>
          <div className={styles['meta-row']}>
            <span>Receipt No.</span>
            <span className={styles.mono}>{invoiceLabel}</span>
          </div>
          <div className={styles['meta-row']}>
            <span>Date</span>
            <span>
              {date.toLocaleDateString('en-KE', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </span>
          </div>
          <div className={styles['meta-row']}>
            <span>Time</span>
            <span>
              {date.toLocaleTimeString('en-KE', {
                hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
          <div className={styles['meta-row']}>
            <span>Table</span>
            <span>{(order.dining_tables as any)?.label ?? 'Walk-in'}</span>
          </div>
          <div className={styles['meta-row']}>
            <span>Payment</span>
            <span className={styles.caps}>{order.payment_method ?? '—'}</span>
          </div>
        </div>

        <div className={styles.divider} />

        {/* Items */}
        <div className={styles.items}>
          <div className={`${styles['item-row']} ${styles['item-header']}`}>
            <span>Item</span>
            <span className={styles['col-qty']}>Qty</span>
            <span className={styles['col-price']}>Price</span>
            <span className={styles['col-amount']}>Amount</span>
          </div>
          {items.map((item: any, i: number) => (
            <div key={i} className={styles['item-row']}>
              <span className={styles['item-name']}>{item.product_name}</span>
              <span className={styles['col-qty']}>{item.quantity}</span>
              <span className={`${styles['col-price']} ${styles.mono}`}>
                {formatKES(item.unit_price)}
              </span>
              <span className={`${styles['col-amount']} ${styles.mono}`}>
                {formatKES(item.subtotal)}
              </span>
            </div>
          ))}
        </div>

        <div className={styles.divider} />

        {/* Totals */}
        <div className={styles.totals}>
          <div className={styles['total-row']}>
            <span>Subtotal (excl. VAT)</span>
            <span className={styles.mono}>{formatKES(order.subtotal)}</span>
          </div>
          <div className={styles['total-row']}>
            <span>VAT 16%</span>
            <span className={styles.mono}>{formatKES(order.tax)}</span>
          </div>
          <div className={`${styles['total-row']} ${styles['total-final']}`}>
            <span>TOTAL</span>
            <span className={styles.mono}>{formatKES(order.total)}</span>
          </div>
        </div>

        <div className={styles.divider} />

        {/* TIMS section — placeholder until KRA ETR integration */}
        <div className={styles.tims}>
          <div className={styles['tims-qr']}>
            <p className={styles['tims-qr-label']}>
              KRA TIMS Verification QR
            </p>
            <div className={styles['tims-qr-placeholder']}>
              {/* QR code rendered here when TIMS is live */}
              <span>TIMS QR</span>
            </div>
          </div>
          <div className={styles['tims-meta']}>
            {business?.kra_pin && (
              <p>VAT Reg. No: <strong>{business.kra_pin}</strong></p>
            )}
            <p>Trader Invoice: <strong>{invoiceLabel}</strong></p>
            <p className={styles['tims-note']}>
              TIMS integration pending KRA ETR device registration.
              This receipt is TIMS-structured and ready for integration.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <p>Thank you for your business!</p>
          <p className={styles['footer-ref']}>{order.order_ref}</p>
        </div>

        {/* Print button — hidden when printing */}
        <PrintReceiptButton />
      </div>
    </div>
  )
}
