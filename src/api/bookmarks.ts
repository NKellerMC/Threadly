import { auth } from '../lib/firebase'
import { requireSupabase } from '../lib/supabase'
import type { ThreadPost, VideoPost } from '../lib/types'
import { mapThread, mapVideo } from './mappers'

export async function toggleVideoBookmark(videoId: string, saved: boolean): Promise<boolean> {
  const uid = auth?.currentUser?.uid
  if (!uid) throw new Error('Sua sessão expirou. Entre novamente para salvar.')
  const db = requireSupabase()
  if (saved) {
    const { error } = await db.from('bookmarks').delete().eq('video_id', videoId).eq('user_id', uid)
    if (error) throw error
    return false
  }
  const { error } = await db.from('bookmarks').insert({ video_id: videoId, user_id: uid })
  if (error) throw error
  return true
}

export async function toggleThreadBookmark(threadId: string, saved: boolean): Promise<boolean> {
  const uid = auth?.currentUser?.uid
  if (!uid) throw new Error('Sua sessão expirou. Entre novamente para salvar.')
  const db = requireSupabase()
  if (saved) {
    const { error } = await db.from('thread_bookmarks').delete().eq('thread_id', threadId).eq('user_id', uid)
    if (error) throw error
    return false
  }
  const { error } = await db.from('thread_bookmarks').insert({ thread_id: threadId, user_id: uid })
  if (error) throw error
  return true
}

export async function getSaved(): Promise<{ videos: VideoPost[]; threads: ThreadPost[] }> {
  const uid = auth?.currentUser?.uid
  if (!uid) throw new Error('Sua sessão expirou. Entre novamente.')
  const db = requireSupabase()
  const [videoRows, threadRows] = await Promise.all([
    db.from('bookmarks').select('video_id').eq('user_id', uid).order('created_at', { ascending: false }),
    db.from('thread_bookmarks').select('thread_id').eq('user_id', uid).order('created_at', { ascending: false }),
  ])
  if (videoRows.error) throw videoRows.error
  if (threadRows.error) throw threadRows.error

  const videoIds = (videoRows.data ?? []).map(r => String(r.video_id))
  const threadIds = (threadRows.data ?? []).map(r => String(r.thread_id))
  const [videos, threads] = await Promise.all([
    videoIds.length ? db.from('videos_public').select('*').in('id', videoIds) : Promise.resolve({ data: [], error: null }),
    threadIds.length ? db.from('threads_public').select('*').in('id', threadIds) : Promise.resolve({ data: [], error: null }),
  ])
  if (videos.error) throw videos.error
  if (threads.error) throw threads.error

  const videoOrder = new Map(videoIds.map((id, index) => [id, index]))
  const threadOrder = new Map(threadIds.map((id, index) => [id, index]))
  return {
    videos: (videos.data ?? []).map(mapVideo).sort((a,b) => (videoOrder.get(a.id) ?? 999) - (videoOrder.get(b.id) ?? 999)).map(v => ({ ...v, saved: true })),
    threads: (threads.data ?? []).map(mapThread).sort((a,b) => (threadOrder.get(a.id) ?? 999) - (threadOrder.get(b.id) ?? 999)).map(t => ({ ...t, saved: true })),
  }
}
