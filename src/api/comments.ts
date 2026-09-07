import { auth } from '../lib/firebase'
import { requireSupabase } from '../lib/supabase'
import type { Comment } from '../lib/types'
import { mapComment } from './mappers'

export async function getVideoComments(videoId: string): Promise<Comment[]> {
  const db = requireSupabase()
  const { data, error } = await db.from('video_comments_public').select('*').eq('video_id', videoId).order('created_at', { ascending: true }).limit(100)
  if (error) throw error
  return (data ?? []).map(mapComment)
}

export async function addVideoComment(videoId: string, body: string): Promise<Comment> {
  const uid = auth?.currentUser?.uid
  if (!uid) throw new Error('Sua sessão expirou. Entre novamente para comentar.')
  const text = body.trim()
  if (!text) throw new Error('Escreva um comentário.')
  const db = requireSupabase()
  const { data, error } = await db.from('video_comments').insert({ video_id: videoId, user_id: uid, body: text }).select('id, video_id, user_id, body, created_at').single()
  if (error) throw error
  const profile = await db.from('profiles').select('username,display_name,avatar_url').eq('id', uid).maybeSingle()
  if (profile.error) throw profile.error
  return mapComment({ ...data, ...(profile.data ?? {}) })
}
