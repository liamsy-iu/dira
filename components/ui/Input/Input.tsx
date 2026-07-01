import React from 'react'
import styles from './Input.module.css'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  size?: 'md' | 'lg'
  mono?: boolean
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  required?: boolean
}

export function Input({
  label,
  hint,
  error,
  size = 'md',
  mono = false,
  prefix,
  suffix,
  required,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  const wrapperClasses = [
    styles.wrapper,
    size === 'lg' ? styles['size-lg'] : '',
    mono ? styles.mono : '',
  ]
    .filter(Boolean)
    .join(' ')

  const inputWrapClasses = [
    styles['input-wrap'],
    prefix ? styles['has-prefix'] : '',
    suffix ? styles['has-suffix'] : '',
  ]
    .filter(Boolean)
    .join(' ')

  const inputClasses = [
    styles.input,
    error ? styles['input-error'] : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={wrapperClasses}>
      {label && (
        <label
          htmlFor={inputId}
          className={`${styles.label} ${required ? styles.required : ''}`}
        >
          {label}
        </label>
      )}

      <div className={inputWrapClasses}>
        {prefix && (
          <span className={styles.prefix} aria-hidden="true">
            {prefix}
          </span>
        )}

        <input
          id={inputId}
          className={inputClasses}
          required={required}
          aria-invalid={!!error}
          aria-describedby={
            error
              ? `${inputId}-error`
              : hint
              ? `${inputId}-hint`
              : undefined
          }
          {...props}
        />

        {suffix && (
          <span className={styles.suffix} aria-hidden="true">
            {suffix}
          </span>
        )}
      </div>

      {error && (
        <span
          id={`${inputId}-error`}
          className={styles['error-message']}
          role="alert"
        >
          {error}
        </span>
      )}

      {hint && !error && (
        <span id={`${inputId}-hint`} className={styles.hint}>
          {hint}
        </span>
      )}
    </div>
  )
}
