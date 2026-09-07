import { auth } from '../lib/firebase'
import { demoThreads, demoVideos } from '../lib/demo'
import { requireSupabase, supabase } from '../lib/supabase'
import { supabaseConfigured } from '../lib/config'
import type { ThreadPost, VideoPost } from '../lib/types'
import { mapThread, mapVideo } from './mappers'

export async function toggleVideoBookmark(videoId: string, saved: boolean): Promise<boolean> {
  const uid = auth?.currentUser?.uid
  if (!uid) throw new Error('Entre na sua conta para salvar.')
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
  if (!uid) throw new Error('Entre na sua conta para salvar.')
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
  if (!uid || !supabaseConfigured || !supabase) return { videos: demoVideos.slice(0, 1), threads: demoThreads.slice(0, 2) }
  const [videoRows, threadRows] = await Promise.all([
    supabase.from('bookmarks').select('video_id').eq('user_id', uid).order('created_at', { ascending: false }),
    supabase.from('thread_bookmarks').select('thread_id').eq('user_id', uid).order('created_at', { ascending: false }),
  ])
  if (videoRows.error) throw videoRows.error
  if (threadRows.error) throw threadRows.error
  const videoIds = (videoRows.data ?? []).map(r => String(r.video_id))
  const threadIds = (threadRows.data ?? []).map(r => String(r.thread_id))
  const [videos, threads] = await Promise.all([
    videoIds.length ? supabase.from('videos_public').select('*').in('id', videoIds) : Promise.resolve({ data: [], error: null }),
    threadIds.length ? supabase.from('threads_public').select('*').in('id', threadIds) : Promise.resolve({ data: [], error: null }),
  ])
  if (videos.error) throw videos.error
  if (threads.error) throw threads.error
  return {
    videos: (videos.data ?? []).map(mapVideo).map(v => ({ ...v, saved: true })),
    threads: (threads.data ?? []).map(mapThread).map(t => ({ ...t, saved: true })),
  }
}
