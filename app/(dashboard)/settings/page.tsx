import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SettingsForm } from './SettingsForm'
import styles from './page.module.css'

export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('name, address, phone, email, kra_pin')
    .eq('owner_id', user.id)
    .single()

  if (!business) redirect('/login')

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>Settings</h2>
        <p className={styles.subtitle}>Manage your business profile</p>
      </div>
      <SettingsForm business={business} />
    </div>
  )
}
