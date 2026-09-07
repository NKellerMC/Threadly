import { auth } from '../lib/firebase'
import { demoComments } from '../lib/demo'
import { requireSupabase, supabase } from '../lib/supabase'
import { supabaseConfigured } from '../lib/config'
import type { Comment } from '../lib/types'
import { mapComment } from './mappers'

export async function getVideoComments(videoId: string): Promise<Comment[]> {
  if (!supabaseConfigured || !supabase) return demoComments.filter(c => c.videoId === videoId)
  const { data, error } = await supabase.from('video_comments_public').select('*').eq('video_id', videoId).order('created_at', { ascending: true }).limit(100)
  if (error) throw error
  return (data ?? []).map(mapComment)
}

export async function addVideoComment(videoId: string, body: string): Promise<Comment> {
  const uid = auth?.currentUser?.uid
  if (!uid) throw new Error('Entre na sua conta para comentar.')
  const db = requireSupabase()
  const { data, error } = await db.from('video_comments').insert({ video_id: videoId, user_id: uid, body: body.trim() }).select('id, video_id, user_id, body, created_at').single()
  if (error) throw error
  const profile = await db.from('profiles').select('username,display_name,avatar_url').eq('id', uid).maybeSingle()
  return mapComment({ ...data, ...(profile.data ?? {}) })
}
