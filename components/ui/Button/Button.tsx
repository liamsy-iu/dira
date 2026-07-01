import React from 'react'
import styles from './Button.module.css'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
  iconOnly?: boolean
  /** Renders as an anchor tag while keeping Button styles */
  href?: string
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  iconOnly = false,
  href,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[`variant-${variant}`],
    styles[`size-${size}`],
    loading ? styles.loading : '',
    fullWidth ? styles['full-width'] : '',
    iconOnly ? styles['icon-only'] : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      {loading && (
        <span
          className={styles.spinner}
          aria-hidden="true"
        />
      )}
      <span className={styles.label}>{children}</span>
    </>
  )

  if (href) {
    return (
      <a href={href} className={classes}>
        {content}
      </a>
    )
  }

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {content}
    </button>
  )
}
