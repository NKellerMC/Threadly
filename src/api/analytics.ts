import { auth } from '../lib/firebase'
import { requireSupabase } from '../lib/supabase'
import type { CreatorStats } from '../lib/types'

export async function getCreatorStats(): Promise<CreatorStats> {
  const uid = auth?.currentUser?.uid
  if (!uid) throw new Error('Sua sessão expirou. Entre novamente.')
  const db = requireSupabase()
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const [videos, threads, profile, recentViews] = await Promise.all([
    db.from('videos').select('likes_count,views_count').eq('user_id', uid),
    db.from('threads').select('likes_count').eq('user_id', uid),
    db.from('profiles_public').select('followers_count').eq('id', uid).maybeSingle(),
    db.from('video_views').select('id, videos!inner(user_id)').eq('videos.user_id', uid).gte('created_at', since),
  ])
  if (videos.error) throw videos.error
  if (threads.error) throw threads.error
  if (profile.error) throw profile.error
  if (recentViews.error) throw recentViews.error

  return {
    videos: videos.data?.length ?? 0,
    threads: threads.data?.length ?? 0,
    totalViews: (videos.data ?? []).reduce((sum, v) => sum + Number(v.views_count ?? 0), 0),
    totalLikes: (videos.data ?? []).reduce((sum, v) => sum + Number(v.likes_count ?? 0), 0) + (threads.data ?? []).reduce((sum, t) => sum + Number(t.likes_count ?? 0), 0),
    followers: Number(profile.data?.followers_count ?? 0),
    last30DaysViews: recentViews.data?.length ?? 0,
  }
}
