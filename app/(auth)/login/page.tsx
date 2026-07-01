'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Compass } from 'lucide-react'
import { loginAction } from '@/lib/actions/auth'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import styles from '../auth.module.css'

const initialState = { error: undefined as string | undefined }

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
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
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to your Dira dashboard</p>
      </div>

      {/* Form */}
      <form action={formAction} className={styles.form}>
        {state?.error && (
          <div className={styles['error-banner']} role="alert">
            {state.error}
          </div>
        )}

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
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isPending}
        >
          Sign in
        </Button>
      </form>

      {/* Footer */}
      <p className={styles.footer}>
        No account?{' '}
        <Link href="/signup">Create one free</Link>
      </p>
    </div>
  )
}
