import { auth } from '../lib/firebase'
import { demoVideos } from '../lib/demo'
import { supabase } from '../lib/supabase'
import { supabaseConfigured } from '../lib/config'
import type { VideoPost } from '../lib/types'
import { mapVideo } from './mappers'

async function decorateVideos(videos: VideoPost[]): Promise<VideoPost[]> {
  const uid = auth?.currentUser?.uid
  if (!uid || !supabase || !videos.length) return videos
  const ids = videos.map(v => v.id)
  const [likes, saves, follows] = await Promise.all([
    supabase.from('video_likes').select('video_id').eq('user_id', uid).in('video_id', ids),
    supabase.from('bookmarks').select('video_id').eq('user_id', uid).in('video_id', ids),
    supabase.from('follows').select('following_id').eq('follower_id', uid).in('following_id', [...new Set(videos.map(v => v.userId))]),
  ])
  const liked = new Set((likes.data ?? []).map(r => String(r.video_id)))
  const saved = new Set((saves.data ?? []).map(r => String(r.video_id)))
  const following = new Set((follows.data ?? []).map(r => String(r.following_id)))
  return videos.map(v => ({ ...v, liked: liked.has(v.id), saved: saved.has(v.id), followingAuthor: following.has(v.userId) }))
}

export async function getVideos(options: { userId?: string; limit?: number } = {}): Promise<VideoPost[]> {
  if (!supabaseConfigured || !supabase) {
    return options.userId ? demoVideos.filter(v => v.userId === options.userId) : demoVideos
  }
  let query = supabase.from('videos_public').select('*').order('created_at', { ascending: false }).limit(options.limit ?? 30)
  if (options.userId) query = query.eq('user_id', options.userId)
  const { data, error } = await query
  if (error) throw error
  return decorateVideos((data ?? []).map(mapVideo))
}

export async function getVideo(videoId: string): Promise<VideoPost | null> {
  if (!supabaseConfigured || !supabase) return demoVideos.find(v => v.id === videoId) ?? null
  const { data, error } = await supabase.from('videos_public').select('*').eq('id', videoId).maybeSingle()
  if (error) throw error
  if (!data) return null
  return (await decorateVideos([mapVideo(data)]))[0]
}

export async function recordView(videoId: string): Promise<void> {
  const viewerId = auth?.currentUser?.uid
  if (!viewerId || !supabaseConfigured || !supabase) return
  const sessionKey = `threadly:view:${videoId}`
  if (sessionStorage.getItem(sessionKey)) return
  sessionStorage.setItem(sessionKey, '1')
  const { error } = await supabase.rpc('record_video_view', { p_video_id: videoId, p_viewer_id: viewerId })
  if (error) sessionStorage.removeItem(sessionKey)
}

export async function getTrendingVideos(limit = 24): Promise<VideoPost[]> {
  if (!supabaseConfigured || !supabase) return [...demoVideos].sort((a,b)=>b.views-a.views)
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const { data, error } = await supabase.from('videos_public').select('*').gte('created_at', since).order('views_count', { ascending: false }).limit(limit)
  if (error) throw error
  return decorateVideos((data ?? []).map(mapVideo))
}

export async function getWatchHistory(): Promise<VideoPost[]> {
  const uid = auth?.currentUser?.uid
  if (!uid || !supabaseConfigured || !supabase) return demoVideos.slice().reverse()
  const { data: views, error } = await supabase.from('video_views').select('video_id,created_at').eq('viewer_id', uid).order('created_at', { ascending: false }).limit(80)
  if (error) throw error
  const ids = [...new Set((views ?? []).map(row => String(row.video_id)))]
  if (!ids.length) return []
  const { data, error: videoError } = await supabase.from('videos_public').select('*').in('id', ids)
  if (videoError) throw videoError
  const index = new Map(ids.map((id,i)=>[id,i]))
  return decorateVideos((data ?? []).map(mapVideo).sort((a,b)=>(index.get(a.id)??99)-(index.get(b.id)??99)))
}

export async function getLikedVideos(): Promise<VideoPost[]> {
  const uid = auth?.currentUser?.uid
  if (!uid || !supabaseConfigured || !supabase) return demoVideos.slice(0,2).map(v=>({...v,liked:true}))
  const { data: likes, error } = await supabase.from('video_likes').select('video_id').eq('user_id', uid).order('created_at', { ascending: false })
  if (error) throw error
  const ids = (likes ?? []).map(row=>String(row.video_id))
  if (!ids.length) return []
  const { data, error: videoError } = await supabase.from('videos_public').select('*').in('id', ids)
  if (videoError) throw videoError
  const index = new Map(ids.map((id,i)=>[id,i]))
  return decorateVideos((data ?? []).map(mapVideo).sort((a,b)=>(index.get(a.id)??99)-(index.get(b.id)??99)))
}
