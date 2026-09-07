import { auth } from '../lib/firebase'
import { demoNotifications } from '../lib/demo'
import { requireSupabase, supabase } from '../lib/supabase'
import { supabaseConfigured } from '../lib/config'
import type { NotificationItem } from '../lib/types'
import { mapNotification } from './mappers'

export async function getNotifications(): Promise<NotificationItem[]> {
  const uid = auth?.currentUser?.uid
  if (!uid || !supabaseConfigured || !supabase) return demoNotifications
  const { data, error } = await supabase.from('notifications_public').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(60)
  if (error) throw error
  return (data ?? []).map(mapNotification)
}

export async function markAllNotificationsRead(): Promise<void> {
  const uid = auth?.currentUser?.uid
  if (!uid) return
  const db = requireSupabase()
  const { error } = await db.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', uid).is('read_at', null)
  if (error) throw error
}
