import { auth } from '../lib/firebase'
import { demoProfiles, demoThreads, demoVideos } from '../lib/demo'
import { supabase } from '../lib/supabase'
import { supabaseConfigured } from '../lib/config'
import type { CreatorStats } from '../lib/types'

export async function getCreatorStats(): Promise<CreatorStats> {
  const uid = auth?.currentUser?.uid
  if (!uid || !supabaseConfigured || !supabase) {
    return {
      videos: demoVideos.length,
      threads: demoThreads.length,
      totalViews: demoVideos.reduce((sum, v) => sum + v.views, 0),
      totalLikes: demoVideos.reduce((sum, v) => sum + v.likes, 0) + demoThreads.reduce((sum, t) => sum + t.likes, 0),
      followers: demoProfiles[0].followers,
      last30DaysViews: Math.round(demoVideos.reduce((sum, v) => sum + v.views, 0) * .82),
    }
  }
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const [videos, threads, profile, recentViews] = await Promise.all([
    supabase.from('videos').select('likes_count,views_count').eq('user_id', uid),
    supabase.from('threads').select('likes_count').eq('user_id', uid),
    supabase.from('profiles_public').select('followers_count').eq('id', uid).maybeSingle(),
    supabase.from('video_views').select('id, videos!inner(user_id)').eq('videos.user_id', uid).gte('created_at', since),
  ])
  if (videos.error) throw videos.error
  if (threads.error) throw threads.error
  return {
    videos: videos.data?.length ?? 0,
    threads: threads.data?.length ?? 0,
    totalViews: (videos.data ?? []).reduce((sum, v) => sum + Number(v.views_count ?? 0), 0),
    totalLikes: (videos.data ?? []).reduce((sum, v) => sum + Number(v.likes_count ?? 0), 0) + (threads.data ?? []).reduce((sum, t) => sum + Number(t.likes_count ?? 0), 0),
    followers: Number(profile.data?.followers_count ?? 0),
    last30DaysViews: recentViews.data?.length ?? 0,
  }
}
