'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function loginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // Don't leak whether the email exists — generic message
    return { error: 'Incorrect email or password. Please try again.' }
  }

  redirect('/')
}

export async function signupAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const businessName = formData.get('business_name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!businessName || !email || !password) {
    return { error: 'All fields are required.' }
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        business_name: businessName,
      },
    },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'An account with this email already exists.' }
    }
    return { error: 'Something went wrong. Please try again.' }
  }

  redirect('/')
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
