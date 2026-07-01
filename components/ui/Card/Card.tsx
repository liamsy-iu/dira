import React from 'react'
import styles from './Card.module.css'

type CardPadding = 'none' | 'sm' | 'md' | 'lg'

interface CardProps {
  padding?: CardPadding
  hoverable?: boolean
  className?: string
  onClick?: () => void
  children: React.ReactNode
}

interface CardHeaderProps {
  title?: string
  children?: React.ReactNode
  className?: string
}

interface StatCardProps {
  label: string
  value: string
  sub?: string
  className?: string
}

export function Card({
  padding = 'none',
  hoverable = false,
  className,
  onClick,
  children,
}: CardProps) {
  return (
    <div
      className={[
        styles.card,
        styles[`padding-${padding}`],
        hoverable ? styles.hoverable : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, children, className }: CardHeaderProps) {
  return (
    <div className={`${styles.header} ${className ?? ''}`}>
      {title && <span className={styles.title}>{title}</span>}
      {children}
    </div>
  )
}

export function CardBody({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`${styles.body} ${className ?? ''}`}>
      {children}
    </div>
  )
}

export function CardFooter({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`${styles.footer} ${className ?? ''}`}>
      {children}
    </div>
  )
}

/** Dashboard metric card */
export function StatCard({ label, value, sub, className }: StatCardProps) {
  return (
    <div className={`${styles.stat} ${className ?? ''}`}>
      <span className={styles['stat-label']}>{label}</span>
      <span className={styles['stat-value']}>{value}</span>
      {sub && <span className={styles['stat-sub']}>{sub}</span>}
    </div>
  )
}
