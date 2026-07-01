'use client'

import { motion } from 'framer-motion'
import { formatKES } from '@/lib/utils'
import styles from './OrderConfirmation.module.css'

interface OrderConfirmationProps {
  orderRef: string
  total: number
  tableLabel: string
  businessName: string
  onNewOrder: () => void
}

export function OrderConfirmation({
  orderRef,
  total,
  tableLabel,
  businessName,
  onNewOrder,
}: OrderConfirmationProps) {
  return (
    <div className={styles.page} data-theme="light">
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      >
        {/* Animated checkmark */}
        <motion.div
          className={styles.check}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: 'spring',
            damping: 12,
            stiffness: 200,
            delay: 0.1,
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
          >
            <motion.path
              d="M7 16l7 7 11-12"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
            />
          </svg>
        </motion.div>

        {/* Message */}
        <motion.div
          className={styles.content}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h1 className={styles.title}>Order placed!</h1>
          <p className={styles.subtitle}>
            We've received your order at {tableLabel}, {businessName}.
            We'll bring it to you shortly.
          </p>
        </motion.div>

        {/* Order details */}
        <motion.div
          className={styles.details}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className={styles['detail-row']}>
            <span className={styles['detail-label']}>Order ref</span>
            <span className={styles['detail-value']}>{orderRef}</span>
          </div>
          <div className={styles['detail-row']}>
            <span className={styles['detail-label']}>Total</span>
            <span className={styles['detail-value']}>{formatKES(total)}</span>
          </div>
          <div className={styles['detail-row']}>
            <span className={styles['detail-label']}>Payment</span>
            <span className={styles['detail-value']}>Pay at counter</span>
          </div>
        </motion.div>

        {/* Order more */}
        <motion.button
          className={styles['order-more']}
          onClick={onNewOrder}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Add more items
        </motion.button>
      </motion.div>
    </div>
  )
}
