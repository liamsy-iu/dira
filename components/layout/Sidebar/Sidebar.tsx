'use client'

import {
  Compass, LayoutDashboard, ShoppingCart, ChefHat,
  UtensilsCrossed, Table2, BarChart3, Settings, LogOut,
} from 'lucide-react'
import { logoutAction } from '@/lib/actions/auth'
import type { DashboardTab } from '@/lib/types/dashboard'
import styles from './Sidebar.module.css'

interface NavItem {
  tab: DashboardTab
  label: string
  icon: React.ReactNode
}

const primaryNav: NavItem[] = [
  { tab: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} strokeWidth={1.5} /> },
  { tab: 'pos',      label: 'POS',      icon: <ShoppingCart size={18} strokeWidth={1.5} /> },
  { tab: 'kitchen',  label: 'Kitchen',  icon: <ChefHat size={18} strokeWidth={1.5} /> },
  { tab: 'menu',     label: 'Menu',     icon: <UtensilsCrossed size={18} strokeWidth={1.5} /> },
  { tab: 'tables',   label: 'Tables',   icon: <Table2 size={18} strokeWidth={1.5} /> },
  { tab: 'reports',  label: 'Reports',  icon: <BarChart3 size={18} strokeWidth={1.5} /> },
]

interface SidebarProps {
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  pendingOrders?: number
}

export function Sidebar({ activeTab, onTabChange, pendingOrders = 0 }: SidebarProps) {
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
            const isActive = activeTab === item.tab
            const badge = item.tab === 'kitchen' && pendingOrders > 0 ? pendingOrders : undefined

            return (
              <button
                key={item.tab}
                className={`${styles['nav-item']} ${isActive ? styles.active : ''}`}
                onClick={() => onTabChange(item.tab)}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={styles['nav-item-icon']}>{item.icon}</span>
                {item.label}
                {badge !== undefined && (
                  <span className={styles['nav-badge']}>{badge}</span>
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Bottom */}
      <div className={styles.bottom}>
        <button
          className={`${styles['nav-item']} ${activeTab === 'settings' ? styles.active : ''}`}
          onClick={() => onTabChange('settings')}
          aria-current={activeTab === 'settings' ? 'page' : undefined}
        >
          <span className={styles['nav-item-icon']}><Settings size={18} strokeWidth={1.5} /></span>
          Settings
        </button>

        <form action={logoutAction}>
          <button type="submit" className={styles['nav-item']}>
            <span className={styles['nav-item-icon']}><LogOut size={18} strokeWidth={1.5} /></span>
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
