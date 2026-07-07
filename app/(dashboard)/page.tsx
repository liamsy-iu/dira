'use client'

import { lazy, Suspense, useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar/Sidebar'
import { Topbar } from '@/components/layout/Topbar/Topbar'
import { Spinner } from '@/components/ui/Spinner/Spinner'
import { useDiraStore } from '@/lib/store/dira'
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
  const role = useDiraStore((s) => s.role)

  // Cashiers only see POS and Kitchen
  const isOwner = role === 'owner'

  // Keep active tab valid when role is cashier
  const effectiveTab = !isOwner && activeTab !== 'pos' && activeTab !== 'kitchen'
    ? 'pos'
    : activeTab

  return (
    <div className={styles.shell}>
      <Sidebar activeTab={effectiveTab} onTabChange={setActiveTab} role={role} />
      <div className={styles.main}>
        <Topbar title="Dira" />
        <main className={styles.content} id="main-content">
        <Suspense fallback={<TabSpinner />}>
          <div style={{ display: effectiveTab === 'overview'  ? 'block' : 'none' }}>{isOwner && <Overview />}</div>
          <div style={{ display: effectiveTab === 'pos'       ? 'block' : 'none' }}><POSTab /></div>
          <div style={{ display: effectiveTab === 'kitchen'   ? 'block' : 'none' }}><KitchenTab /></div>
          <div style={{ display: effectiveTab === 'menu'      ? 'block' : 'none' }}>{isOwner && <MenuTab />}</div>
          <div style={{ display: effectiveTab === 'tables'    ? 'block' : 'none' }}>{isOwner && <TablesTab />}</div>
          <div style={{ display: effectiveTab === 'reports'   ? 'block' : 'none' }}>{isOwner && <ReportsTab />}</div>
          <div style={{ display: effectiveTab === 'settings'  ? 'block' : 'none' }}>{isOwner && <SettingsTab />}</div>
        </Suspense>
        </main>
      </div>
    </div>
  )
}
