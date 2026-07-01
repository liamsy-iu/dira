'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import styles from './Topbar.module.css'

interface TopbarProps {
  title: string
  businessName?: string
}

export function Topbar({ title, businessName }: TopbarProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  // Sync with the theme already set by the layout init script
  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme')
    if (current === 'light') setTheme('light')
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem('dira-theme', next)
    } catch {}
  }

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <span className={styles['page-title']}>{title}</span>
      </div>

      <div className={styles.right}>
        {businessName && (
          <div className={styles['business-pill']}>
            <span className={styles['business-dot']} aria-hidden="true" />
            {businessName}
          </div>
        )}

        <button
          className={styles['icon-btn']}
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark'
            ? <Sun size={16} strokeWidth={1.5} />
            : <Moon size={16} strokeWidth={1.5} />
          }
        </button>
      </div>
    </header>
  )
}
