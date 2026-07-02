import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar/Sidebar'
import { Topbar } from '@/components/layout/Topbar/Topbar'
import { StoreInitializer } from '@/components/layout/StoreInitializer'
import styles from './dashboard.module.css'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Auth check stays server-side — security boundary
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Business data now loaded client-side via Zustand store (StoreInitializer)
  // No server round trip needed here — saves one Supabase query per navigation

  return (
    <div className={styles.shell}>
      <StoreInitializer />
      <Sidebar />
      <div className={styles.main}>
        <Topbar title="Dira" />
        <main className={styles.content} id="main-content">
          {children}
        </main>
      </div>
    </div>
  )
}
