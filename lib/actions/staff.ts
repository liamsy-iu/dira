'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

type StaffState = { error: string | undefined; success: boolean }

export async function inviteStaffAction(
  _prev: StaffState,
  formData: FormData
): Promise<StaffState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.', success: false }

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()

  if (!business) return { error: 'Business not found.', success: false }

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const name  = (formData.get('name')  as string)?.trim()

  if (!email || !name) return { error: 'Name and email are required.', success: false }

  const serviceSupabase = createServiceClient()

  // Invite via Supabase admin — sends email with magic link
  // Metadata is baked into the invited user's JWT so the app
  // can detect their role without a separate DB lookup
  const { error: inviteError } = await serviceSupabase.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        staff_business_id:   business.id,
        staff_business_name: business.name,
        staff_name:          name,
        staff_role:          'cashier',
      },
    }
  )

  if (inviteError) {
    if (inviteError.message.includes('already been registered')) {
      return { error: 'This email is already registered.', success: false }
    }
    return { error: inviteError.message, success: false }
  }

  // Record invite so owner can see their staff list
  await serviceSupabase
    .from('staff_invites')
    .upsert({ business_id: business.id, email, name, role: 'cashier' })

  revalidatePath('/settings')
  return { error: undefined, success: true }
}

export async function removeStaffAction(email: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const serviceSupabase = createServiceClient()

  // Remove from staff_invites table
  await supabase.from('staff_invites').delete().eq('email', email)

  // Disable their Supabase account so they can't log in
  const { data: invitedUser } = await serviceSupabase.auth.admin.listUsers()
  const staffUser = invitedUser?.users?.find((u) => u.email === email)
  if (staffUser) {
    await serviceSupabase.auth.admin.updateUserById(staffUser.id, {
      ban_duration: 'none', // We use delete instead
    })
    await serviceSupabase.auth.admin.deleteUser(staffUser.id)
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function getStaffAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!business) return []

  const { data } = await supabase
    .from('staff_invites')
    .select('email, name, role, invited_at')
    .eq('business_id', business.id)
    .order('invited_at', { ascending: false })

  return data ?? []
}
