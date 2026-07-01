'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type TableState = { error: string | undefined; success: boolean }

export async function createTableAction(
  _prev: TableState,
  formData: FormData
): Promise<TableState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.', success: false }

  const { data: business } = await supabase
    .from('businesses').select('id').eq('owner_id', user.id).single()
  if (!business) return { error: 'Business not found.', success: false }

  const label = (formData.get('label') as string)?.trim()
  if (!label) return { error: 'Table name is required.', success: false }

  const { error } = await supabase.from('dining_tables').insert({
    business_id: business.id,
    label,
  })

  if (error) return { error: 'Failed to create table.', success: false }

  revalidatePath('/tables')
  return { error: undefined, success: true }
}

export async function deleteTableAction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  const { error } = await supabase.from('dining_tables').delete().eq('id', id)
  if (error) return { error: 'Failed to delete table.' }
  revalidatePath('/tables')
  return { success: true }
}

export async function updateTableLabelAction(id: string, label: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  const { error } = await supabase
    .from('dining_tables').update({ label: label.trim() }).eq('id', id)
  if (error) return { error: 'Failed to update table.' }
  revalidatePath('/tables')
  return { success: true }
}
