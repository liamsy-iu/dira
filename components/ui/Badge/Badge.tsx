import React from 'react'
import styles from './Badge.module.css'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface BadgeProps {
  variant?: BadgeVariant
  dot?: boolean
  pulseDot?: boolean
  children: React.ReactNode
  className?: string
}

/**
 * Maps order/payment status strings to badge variants.
 * Use this utility to keep status → colour mapping in one place.
 */
export function statusToVariant(
  status: string
): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    paid:       'success',
    confirmed:  'success',
    ready:      'success',
    preparing:  'warning',
    pending:    'warning',
    cancelled:  'danger',
    failed:     'danger',
    active:     'success',
    expired:    'danger',
    trial:      'info',
    info:       'info',
  }
  return map[status.toLowerCase()] ?? 'default'
}

export function Badge({
  variant = 'default',
  dot = false,
  pulseDot = false,
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={[
        styles.badge,
        styles[`variant-${variant}`],
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {(dot || pulseDot) && (
        <span
          className={`${styles.dot} ${pulseDot ? styles.pulse : ''}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}
