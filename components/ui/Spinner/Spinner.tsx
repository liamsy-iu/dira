import styles from './Spinner.module.css'

type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl'

interface SpinnerProps {
  size?: SpinnerSize
  label?: string
  fullPage?: boolean
  className?: string
}

export function Spinner({
  size = 'md',
  label,
  fullPage = false,
  className,
}: SpinnerProps) {
  const spinner = (
    <span
      className={`${styles.spinner} ${styles[`size-${size}`]}`}
      role="status"
      aria-label={label ?? 'Loading'}
    />
  )

  if (label || fullPage) {
    return (
      <div
        className={[
          styles.wrapper,
          fullPage ? styles['full-page'] : '',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {spinner}
        {label && <span aria-live="polite">{label}</span>}
      </div>
    )
  }

  return spinner
}
