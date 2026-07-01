'use client'

import styles from './page.module.css'

export function PrintButton() {
  return (
    <button
      className={styles['print-btn']}
      onClick={() => window.print()}
      aria-label="Print report"
    >
      Print
    </button>
  )
}
