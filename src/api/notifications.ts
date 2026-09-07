import { auth } from '../lib/firebase'
import { requireSupabase } from '../lib/supabase'
import type { NotificationItem } from '../lib/types'
import { mapNotification } from './mappers'

export async function getNotifications(): Promise<NotificationItem[]> {
  const uid = auth?.currentUser?.uid
  if (!uid) throw new Error('Sua sessão expirou. Entre novamente.')
  const db = requireSupabase()
  const { data, error } = await db.from('notifications_public').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(60)
  if (error) throw error
  return (data ?? []).map(mapNotification)
}

export async function markAllNotificationsRead(): Promise<void> {
  const uid = auth?.currentUser?.uid
  if (!uid) throw new Error('Sua sessão expirou. Entre novamente.')
  const db = requireSupabase()
  const { error } = await db.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', uid).is('read_at', null)
  if (error) throw error
}
