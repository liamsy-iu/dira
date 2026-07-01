'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Compass } from 'lucide-react'
import { signupAction } from '@/lib/actions/auth'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import styles from '../auth.module.css'

const initialState: { error: string | undefined } = { error: undefined }

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(
    signupAction,
    initialState
  )

  return (
    <div className={styles.card}>
      {/* Brand */}
      <div className={styles.brand}>
        <div className={styles.compass} aria-hidden="true">
          <Compass size={20} strokeWidth={1.5} />
        </div>
        <span className={styles.wordmark}>Dira</span>
      </div>

      {/* Heading */}
      <div className={styles.heading}>
        <h1 className={styles.title}>Set up your café</h1>
        <p className={styles.subtitle}>
          Free for 7 days — no card required
        </p>
      </div>

      {/* Form */}
      <form action={formAction} className={styles.form}>
        {state?.error && (
          <div className={styles['error-banner']} role="alert">
            {state.error}
          </div>
        )}

        <Input
          label="Business name"
          name="business_name"
          type="text"
          autoComplete="organization"
          placeholder="Kula Café"
          required
        />

        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@yourcafe.com"
          required
        />

        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Min. 8 characters"
          hint="At least 8 characters"
          required
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isPending}
        >
          Create account
        </Button>
      </form>

      {/* Footer */}
      <p className={styles.footer}>
        Already have an account?{' '}
        <Link href="/login">Sign in</Link>
      </p>
    </div>
  )
}
