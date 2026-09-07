import { auth } from '../lib/firebase'
import { requireSupabase } from '../lib/supabase'

async function toggle(table: 'video_likes' | 'thread_likes', idColumn: 'video_id' | 'thread_id', id: string, currentlyLiked: boolean): Promise<boolean> {
  const uid = auth?.currentUser?.uid
  if (!uid) throw new Error('Entre na sua conta para curtir.')
  const db = requireSupabase()
  if (currentlyLiked) {
    const { error } = await db.from(table).delete().eq(idColumn, id).eq('user_id', uid)
    if (error) throw error
    return false
  }
  const { error } = await db.from(table).insert({ [idColumn]: id, user_id: uid })
  if (error) throw error
  return true
}

export const toggleVideoLike = (videoId: string, liked: boolean) => toggle('video_likes', 'video_id', videoId, liked)
export const toggleThreadLike = (threadId: string, liked: boolean) => toggle('thread_likes', 'thread_id', threadId, liked)

export async function getLikedVideoIds(): Promise<string[]> {
  const uid = auth?.currentUser?.uid
  if (!uid) return []
  const db = requireSupabase()
  const { data, error } = await db.from('video_likes').select('video_id').eq('user_id', uid).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(row => String(row.video_id))
}
