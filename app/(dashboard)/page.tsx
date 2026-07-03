'use client'

import { lazy, Suspense, useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar/Sidebar'
import { Topbar } from '@/components/layout/Topbar/Topbar'
import { Spinner } from '@/components/ui/Spinner/Spinner'
import styles from './dashboard.module.css'

import type { DashboardTab } from '@/lib/types/dashboard'

// Lazy load every tab — JS only downloads when first visited
const Overview   = lazy(() => import('./Overview').then(m => ({ default: m.Overview })))
const POSTab     = lazy(() => import('./pos/POSShell').then(m => ({ default: m.POSShell })))
const KitchenTab = lazy(() => import('./kitchen/KitchenShell').then(m => ({ default: m.KitchenShell })))
const MenuTab    = lazy(() => import('./menu/MenuClient').then(m => ({ default: m.MenuClient })))
const TablesTab  = lazy(() => import('./tables/TablesClient').then(m => ({ default: m.TablesClient })))
const ReportsTab = lazy(() => import('./reports/ReportsTab').then(m => ({ default: m.ReportsTab })))
const SettingsTab = lazy(() => import('./settings/SettingsTab').then(m => ({ default: m.SettingsTab })))

function TabSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <Spinner size="lg" />
    </div>
  )
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview')

  return (
    <div className={styles.shell}>
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className={styles.main}>
        <Topbar title="Dira" />
        <main className={styles.content} id="main-content">
        <Suspense fallback={<TabSpinner />}>
          <div style={{ display: activeTab === 'overview'  ? 'block' : 'none' }}><Overview /></div>
          <div style={{ display: activeTab === 'pos'       ? 'block' : 'none' }}><POSTab /></div>
          {/* Kitchen stays mounted always — keeps Realtime alive, no missed orders */}
          <div style={{ display: activeTab === 'kitchen'   ? 'block' : 'none' }}><KitchenTab /></div>
          <div style={{ display: activeTab === 'menu'      ? 'block' : 'none' }}><MenuTab /></div>
          <div style={{ display: activeTab === 'tables'    ? 'block' : 'none' }}><TablesTab /></div>
          <div style={{ display: activeTab === 'reports'   ? 'block' : 'none' }}><ReportsTab /></div>
          <div style={{ display: activeTab === 'settings'  ? 'block' : 'none' }}><SettingsTab /></div>
        </Suspense>
        </main>
      </div>
    </div>
  )
}
