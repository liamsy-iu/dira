'use client'

import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import styles from './Modal.module.css'

type ModalSize = 'sm' | 'md' | 'lg' | 'full'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  size?: ModalSize
  children: React.ReactNode
  footer?: React.ReactNode
  /** Prevent closing when clicking the backdrop */
  locked?: boolean
}

export function Modal({
  open,
  onClose,
  title,
  size = 'md',
  children,
  footer,
  locked = false,
}: ModalProps) {
  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !locked) onClose()
    },
    [onClose, locked]
  )

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleKeyDown)
    // Prevent body scroll while modal is open
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return createPortal(
    <div
      className={styles.overlay}
      onClick={locked ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`${styles.panel} ${styles[`size-${size}`]}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className={styles.header}>
            <span className={styles.title}>{title}</span>
            {!locked && (
              <button
                className={styles.close}
                onClick={onClose}
                aria-label="Close"
              >
                ×
              </button>
            )}
          </div>
        )}

        <div className={styles.body}>{children}</div>

        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body
  )
}
