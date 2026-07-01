'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type SettingsState = { error: string | undefined; success: boolean }

export async function updateSettingsAction(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.', success: false }

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Business name is required.', success: false }

  const { error } = await supabase
    .from('businesses')
    .update({
      name,
      address: (formData.get('address') as string)?.trim() || null,
      phone:   (formData.get('phone')   as string)?.trim() || null,
      email:   (formData.get('email')   as string)?.trim() || null,
      kra_pin: (formData.get('kra_pin') as string)?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('owner_id', user.id)

  if (error) return { error: 'Failed to save settings.', success: false }

  revalidatePath('/settings')
  revalidatePath('/')
  return { error: undefined, success: true }
}
