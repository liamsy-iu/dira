'use client'

import { useActionState, useEffect, useState } from 'react'
import { inviteStaffAction, removeStaffAction, getStaffAction } from '@/lib/actions/staff'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { UserPlus, Trash2, Mail } from 'lucide-react'
import styles from './StaffSection.module.css'

interface StaffInvite {
  email: string
  name: string
  role: string
  invited_at: string
}

const initialState = { error: undefined as string | undefined, success: false }

export function StaffSection() {
  const [staff, setStaff] = useState<StaffInvite[]>([])
  const [showForm, setShowForm] = useState(false)
  const [removingEmail, setRemovingEmail] = useState<string | null>(null)
  const [state, formAction, isPending] = useActionState(inviteStaffAction, initialState)

  useEffect(() => {
    getStaffAction().then((data) => setStaff(data as StaffInvite[]))
  }, [])

  useEffect(() => {
    if (state?.success) {
      setShowForm(false)
      getStaffAction().then((data) => setStaff(data as StaffInvite[]))
    }
  }, [state?.success])

  async function handleRemove(email: string) {
    if (!confirm(`Remove ${email} from your team? They will lose access immediately.`)) return
    setRemovingEmail(email)
    await removeStaffAction(email)
    setStaff((prev) => prev.filter((s) => s.email !== email))
    setRemovingEmail(null)
  }

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Staff</h3>
          <p className={styles.subtitle}>Cashiers can access POS and Kitchen only</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setShowForm(!showForm)}>
          <UserPlus size={14} strokeWidth={1.5} />
          Invite cashier
        </Button>
      </div>

      {showForm && (
        <form action={formAction} className={styles.form}>
          {state?.error && (
            <div className={styles.error}>{state.error}</div>
          )}
          <div className={styles.row}>
            <Input label="Name" name="name" type="text" placeholder="John Kamau" required />
            <Input label="Email" name="email" type="email" placeholder="john@example.com" required />
          </div>
          <div className={styles['form-actions']}>
            <Button variant="ghost" size="sm" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" loading={isPending}>Send invite</Button>
          </div>
        </form>
      )}

      {staff.length > 0 ? (
        <div className={styles.list}>
          {staff.map((member) => (
            <div key={member.email} className={styles.member}>
              <div className={styles['member-icon']}>
                <Mail size={16} strokeWidth={1.5} />
              </div>
              <div className={styles['member-info']}>
                <span className={styles['member-name']}>{member.name}</span>
                <span className={styles['member-email']}>{member.email}</span>
              </div>
              <span className={styles['member-role']}>{member.role}</span>
              <button
                className={styles['remove-btn']}
                onClick={() => handleRemove(member.email)}
                disabled={removingEmail === member.email}
                aria-label={`Remove ${member.name}`}
              >
                <Trash2 size={14} strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>No staff invited yet</p>
      )}
    </div>
  )
}
