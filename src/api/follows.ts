import { auth } from '../lib/firebase'
import { requireSupabase, supabase } from '../lib/supabase'
import { supabaseConfigured } from '../lib/config'

export async function isFollowing(targetUserId: string): Promise<boolean> {
  const uid = auth?.currentUser?.uid
  if (!uid || !supabaseConfigured || !supabase || uid === targetUserId) return false
  const { data, error } = await supabase.from('follows').select('following_id').eq('follower_id', uid).eq('following_id', targetUserId).maybeSingle()
  if (error) throw error
  return Boolean(data)
}

export async function toggleFollow(targetUserId: string, following: boolean): Promise<boolean> {
  const uid = auth?.currentUser?.uid
  if (!uid) throw new Error('Entre na sua conta para seguir pessoas.')
  if (uid === targetUserId) return false
  const db = requireSupabase()
  if (following) {
    const { error } = await db.from('follows').delete().eq('follower_id', uid).eq('following_id', targetUserId)
    if (error) throw error
    return false
  }
  const { error } = await db.from('follows').insert({ follower_id: uid, following_id: targetUserId })
  if (error) throw error
  return true
}
