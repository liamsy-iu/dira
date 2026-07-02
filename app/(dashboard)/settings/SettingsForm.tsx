'use client'

import { useActionState } from 'react'
import { updateSettingsAction } from '@/lib/actions/settings'
import { useDiraStore } from '@/lib/store/dira'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import styles from './page.module.css'

interface Business {
  name: string
  address: string | null
  phone: string | null
  email: string | null
  kra_pin: string | null
}

const initialState: { error: string | undefined; success: boolean } = { error: undefined, success: false }

export function SettingsForm({ business }: { business: Business }) {
  const [state, formAction, isPending] = useActionState(
    updateSettingsAction,
    initialState
  )

  return (
    <form action={formAction} className={styles.form}>
      {state?.error && (
        <div className={styles.error} role="alert">{state.error}</div>
      )}
      {state?.success && (
        <div className={styles.success} role="status">Settings saved.</div>
      )}

      <div className={styles.section}>
        <h3 className={styles['section-title']}>Business details</h3>
        <div className={styles.fields}>
          <Input label="Business name" name="name" type="text" defaultValue={business.name} required />
          <Input label="Address" name="address" type="text" defaultValue={business.address ?? ''} placeholder="123 Kimathi St, Nairobi" hint="Printed on receipts" />
          <Input label="Phone" name="phone" type="tel" defaultValue={business.phone ?? ''} placeholder="0712 345 678" hint="Used on receipts" />
          <Input label="Email" name="email" type="email" defaultValue={business.email ?? ''} placeholder="hello@yourcafe.com" />
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles['section-title']}>Tax & compliance</h3>
        <div className={styles.fields}>
          <Input
            label="KRA PIN"
            name="kra_pin"
            type="text"
            defaultValue={business.kra_pin ?? ''}
            placeholder="A012345678Z"
            hint="Printed on receipts for KRA compliance"
            mono
          />
        </div>
      </div>

      <div className={styles.footer}>
        <Button
          variant="primary"
          size="lg"
          type="submit"
          loading={isPending}
        >
          Save settings
        </Button>
      </div>
    </form>
  )
}
