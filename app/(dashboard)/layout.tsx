import { StoreInitializer } from '@/components/layout/StoreInitializer'

/**
 * Transparent layout — just mounts the store initializer.
 * The SPA page owns the full shell (sidebar, topbar, content).
 * No Supabase calls, no cookies, no dynamic functions.
 * This layout is static and never re-renders on tab switches.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <StoreInitializer />
      {children}
    </>
  )
}
