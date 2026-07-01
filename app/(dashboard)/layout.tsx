import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar/Sidebar'
import { Topbar } from '@/components/layout/Topbar/Topbar'
import styles from './dashboard.module.css'

interface DashboardLayoutProps {
  children: React.ReactNode
  // Next.js 15 parallel routes — title injected per-page
  params?: Promise<{ title?: string }>
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch business name — used in topbar and receipt header
  const { data: business } = await supabase
    .from('businesses')
    .select('name')
    .eq('owner_id', user.id)
    .single()

  const businessName = business?.name ?? user.user_metadata?.business_name ?? ''

  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        <Topbar title="Dira" businessName={businessName} />
        <main className={styles.content} id="main-content">
          {children}
        </main>
      </div>
    </div>
  )
}
