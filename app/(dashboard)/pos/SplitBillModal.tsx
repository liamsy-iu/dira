'use client'

import { useState, useTransition } from 'react'
import { Minus, Plus, Check, Users } from 'lucide-react'
import {
  createSplitOrderAction,
  markOrderPaidAction,
  type SplitEntry,
} from '@/lib/actions/split'
import { Modal } from '@/components/ui/Modal/Modal'
import { Button } from '@/components/ui/Button/Button'
import { formatKES } from '@/lib/utils'
import type { CartItem } from './POSClient'
import styles from './SplitBillModal.module.css'

type Phase =
  | { type: 'configure' }
  | {
      type: 'collecting'
      orderId: string
      orderRef: string
      splits: SplitEntry[]
    }
  | { type: 'complete'; orderRef: string; total: number }

interface SplitBillModalProps {
  open: boolean
  onClose: () => void
  onComplete: () => void
  cart: CartItem[]
}

export function SplitBillModal({
  open,
  onClose,
  onComplete,
  cart,
}: SplitBillModalProps) {
  const [splitCount, setSplitCount] = useState(2)
  const [phase, setPhase] = useState<Phase>({ type: 'configure' })
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | undefined>()

  const cartSubtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  const cartTax = Math.round(cartSubtotal * 0.16)
  const cartTotal = cartSubtotal + cartTax

  // Per-split amounts for preview
  const baseAmount = Math.floor(cartTotal / splitCount)
  const remainder = cartTotal - baseAmount * (splitCount - 1)

  function handleClose() {
    setPhase({ type: 'configure' })
    setSplitCount(2)
    setError(undefined)
    onClose()
  }

  function handleStart() {
    setError(undefined)
    startTransition(async () => {
      const result = await createSplitOrderAction({
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        splitCount,
      })

      if ('error' in result) {
        setError(result.error)
        return
      }

      setPhase({
        type: 'collecting',
        orderId: result.orderId,
        orderRef: result.orderRef,
        splits: result.splits,
      })
    })
  }

  function handleMarkPaid(splitIndex: number) {
    if (phase.type !== 'collecting') return

    const updatedSplits = phase.splits.map((s) =>
      s.index === splitIndex ? { ...s, paid: true } : s
    )

    const allPaid = updatedSplits.every((s) => s.paid)

    if (allPaid) {
      startTransition(async () => {
        await markOrderPaidAction(phase.orderId)
        setPhase({ type: 'complete', orderRef: phase.orderRef, total: cartTotal })
      })
    } else {
      setPhase({ ...phase, splits: updatedSplits })
    }
  }

  // ── Complete phase ────────────────────────────────────────────────────────
  if (phase.type === 'complete') {
    return (
      <Modal open={open} onClose={handleClose} title="Split bill" size="sm">
        <div className={styles.complete}>
          <div className={styles['complete-icon']}>
            <Check size={32} strokeWidth={2} />
          </div>
          <p className={styles['complete-title']}>All settled!</p>
          <p className={styles['complete-ref']}>{phase.orderRef}</p>
          <p className={styles['complete-total']}>
            {formatKES(phase.total)} collected across {splitCount} people
          </p>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => {
              handleClose()
              onComplete()
            }}
          >
            New order
          </Button>
        </div>
      </Modal>
    )
  }

  // ── Collecting phase ──────────────────────────────────────────────────────
  if (phase.type === 'collecting') {
    const paidCount = phase.splits.filter((s) => s.paid).length
    const currentSplit = phase.splits.find((s) => !s.paid)

    return (
      <Modal
        open={open}
        onClose={handleClose}
        title={`Split bill — ${paidCount} of ${splitCount} paid`}
        size="sm"
      >
        <div className={styles.collecting}>
          {/* Progress list */}
          <div className={styles.splits}>
            {phase.splits.map((split) => (
              <div
                key={split.index}
                className={`${styles.split} ${
                  split.paid
                    ? styles['split-paid']
                    : split.index === currentSplit?.index
                    ? styles['split-active']
                    : styles['split-pending']
                }`}
              >
                <div className={styles['split-left']}>
                  <span className={styles['split-icon']}>
                    {split.paid ? (
                      <Check size={14} strokeWidth={2} />
                    ) : (
                      <span className={styles['split-number']}>
                        {split.index + 1}
                      </span>
                    )}
                  </span>
                  <span className={styles['split-label']}>
                    Person {split.index + 1}
                  </span>
                </div>
                <span className={styles['split-amount']}>
                  {formatKES(split.amount)}
                </span>
              </div>
            ))}
          </div>

          {/* Current payment */}
          {currentSplit && (
            <div className={styles['current-payment']}>
              <p className={styles['current-label']}>
                Collect from Person {currentSplit.index + 1}
              </p>
              <p className={styles['current-amount']}>
                {formatKES(currentSplit.amount)}
              </p>
              <Button
                variant="primary"
                size="xl"
                fullWidth
                loading={isPending}
                onClick={() => handleMarkPaid(currentSplit.index)}
              >
                Collected ✓
              </Button>
            </div>
          )}

          <p className={styles.remaining}>
            Remaining:{' '}
            {formatKES(
              phase.splits
                .filter((s) => !s.paid)
                .reduce((sum, s) => sum + s.amount, 0)
            )}
          </p>
        </div>
      </Modal>
    )
  }

  // ── Configure phase ───────────────────────────────────────────────────────
  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Split bill"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={isPending}
            onClick={handleStart}
          >
            Start collecting
          </Button>
        </>
      }
    >
      <div className={styles.configure}>
        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        <div className={styles.total}>
          <span className={styles['total-label']}>Order total</span>
          <span className={styles['total-amount']}>{formatKES(cartTotal)}</span>
        </div>

        {/* Split count selector */}
        <div className={styles.selector}>
          <span className={styles['selector-label']}>Split between</span>
          <div className={styles['selector-controls']}>
            <button
              className={styles['ctrl-btn']}
              onClick={() => setSplitCount((n) => Math.max(2, n - 1))}
              disabled={splitCount <= 2}
              aria-label="Fewer splits"
            >
              <Minus size={18} strokeWidth={2} />
            </button>
            <span className={styles['ctrl-count']}>
              <Users size={16} strokeWidth={1.5} />
              {splitCount}
            </span>
            <button
              className={styles['ctrl-btn']}
              onClick={() => setSplitCount((n) => Math.min(10, n + 1))}
              disabled={splitCount >= 10}
              aria-label="More splits"
            >
              <Plus size={18} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className={styles.preview}>
          {Array.from({ length: splitCount }, (_, i) => (
            <div key={i} className={styles['preview-row']}>
              <span className={styles['preview-label']}>Person {i + 1}</span>
              <span className={styles['preview-amount']}>
                {formatKES(i === splitCount - 1 ? remainder : baseAmount)}
                {i === splitCount - 1 && remainder !== baseAmount && (
                  <span className={styles['preview-note']}> (incl. rounding)</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
