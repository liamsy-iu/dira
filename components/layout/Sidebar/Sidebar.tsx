'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Compass,
  LayoutDashboard,
  ShoppingCart,
  ChefHat,
  UtensilsCrossed,
  Table2,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react'
import { logoutAction } from '@/lib/actions/auth'
import styles from './Sidebar.module.css'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: number
}

const primaryNav: NavItem[] = [
  {
    label: 'Overview',
    href: '/',
    icon: <LayoutDashboard size={18} strokeWidth={1.5} />,
  },
  {
    label: 'POS',
    href: '/pos',
    icon: <ShoppingCart size={18} strokeWidth={1.5} />,
  },
  {
    label: 'Kitchen',
    href: '/kitchen',
    icon: <ChefHat size={18} strokeWidth={1.5} />,
  },
  {
    label: 'Menu',
    href: '/menu',
    icon: <UtensilsCrossed size={18} strokeWidth={1.5} />,
  },
  {
    label: 'Tables',
    href: '/tables',
    icon: <Table2 size={18} strokeWidth={1.5} />,
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: <BarChart3 size={18} strokeWidth={1.5} />,
  },
]

export function Sidebar({ pendingOrders = 0 }: { pendingOrders?: number }) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <aside className={styles.sidebar}>
      {/* Brand */}
      <div className={styles.brand}>
        <div className={styles['brand-icon']} aria-hidden="true">
          <Compass size={14} strokeWidth={1.5} />
        </div>
        <span className={styles['brand-name']}>Dira</span>
      </div>

      {/* Nav */}
      <nav className={styles.nav} aria-label="Main navigation">
        <div className={styles['nav-section']}>
          {primaryNav.map((item) => {
            const badge =
              item.href === '/kitchen' && pendingOrders > 0
                ? pendingOrders
                : undefined

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles['nav-item']} ${
                  isActive(item.href) ? styles.active : ''
                }`}
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                <span className={styles['nav-item-icon']}>{item.icon}</span>
                {item.label}
                {badge !== undefined && (
                  <span className={styles['nav-badge']}>{badge}</span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom — settings + logout */}
      <div className={styles.bottom}>
        <Link
          href="/settings"
          className={`${styles['nav-item']} ${
            isActive('/settings') ? styles.active : ''
          }`}
          aria-current={isActive('/settings') ? 'page' : undefined}
        >
          <span className={styles['nav-item-icon']}>
            <Settings size={18} strokeWidth={1.5} />
          </span>
          Settings
        </Link>

        <form action={logoutAction}>
          <button type="submit" className={styles['nav-item']}>
            <span className={styles['nav-item-icon']}>
              <LogOut size={18} strokeWidth={1.5} />
            </span>
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
