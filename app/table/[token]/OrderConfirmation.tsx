'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Copy, Check } from 'lucide-react'
import { formatKES } from '@/lib/utils'
import styles from './OrderConfirmation.module.css'

interface OrderConfirmationProps {
  orderRef: string
  total: number
  tableLabel: string
  businessName: string
  mpesaCode?: string | null
  onNewOrder: () => void
}

export function OrderConfirmation({
  orderRef,
  total,
  tableLabel,
  businessName,
  mpesaCode,
  onNewOrder,
}: OrderConfirmationProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopyCode() {
    if (!mpesaCode) return
    await navigator.clipboard.writeText(mpesaCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={styles.page}>
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        {/* Check */}
        <motion.div
          className={styles.check}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 400, delay: 0.15 }}
        >
          <CheckCircle2 size={40} strokeWidth={1.5} color="#fff" />
        </motion.div>

        {/* Title */}
        <div className={styles.content}>
          <h1 className={styles.title}>Order placed!</h1>
          <p className={styles.subtitle}>
            Your order has been sent to the kitchen at {businessName}
          </p>
        </div>

        {/* Details */}
        <div className={styles.details}>
          <div className={styles['detail-row']}>
            <span className={styles['detail-label']}>Table</span>
            <span className={styles['detail-value']}>{tableLabel}</span>
          </div>
          <div className={styles['detail-row']}>
            <span className={styles['detail-label']}>Order</span>
            <span className={styles['detail-value']}>{orderRef}</span>
          </div>
          <div className={styles['detail-row']}>
            <span className={styles['detail-label']}>Total</span>
            <span className={styles['detail-value']}>{formatKES(total)}</span>
          </div>
        </div>

        {/* M-Pesa code — prominent, copyable */}
        {mpesaCode && (
          <motion.div
            className={styles['mpesa-wrap']}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p className={styles['mpesa-label']}>M-Pesa Code</p>
            <div className={styles['mpesa-code-row']}>
              <span className={styles['mpesa-code']}>{mpesaCode}</span>
              <button
                className={styles['copy-btn']}
                onClick={handleCopyCode}
                aria-label="Copy M-Pesa code"
              >
                {copied
                  ? <Check size={14} strokeWidth={2} />
                  : <Copy size={14} strokeWidth={1.5} />
                }
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className={styles['mpesa-hint']}>
              The cashier may ask for this code to verify your payment
            </p>
          </motion.div>
        )}

        <button className={styles['order-more']} onClick={onNewOrder}>
          + Add more items
        </button>
      </motion.div>
    </div>
  )
}
