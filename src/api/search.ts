import { demoProfiles, demoThreads, demoVideos } from '../lib/demo'
import { supabase } from '../lib/supabase'
import { supabaseConfigured } from '../lib/config'
import type { SearchResults } from '../lib/types'
import { mapProfile, mapThread, mapVideo } from './mappers'

export async function searchEverything(raw: string): Promise<SearchResults> {
  const query = raw.trim().replace(/[%_]/g, '')
  if (!query) return { profiles: [], threads: [], videos: [] }
  if (!supabaseConfigured || !supabase) {
    const q = query.toLowerCase()
    return {
      profiles: demoProfiles.filter(p => `${p.username} ${p.displayName} ${p.bio}`.toLowerCase().includes(q)),
      threads: demoThreads.filter(p => `${p.username} ${p.displayName} ${p.body}`.toLowerCase().includes(q)),
      videos: demoVideos.filter(v => `${v.username} ${v.displayName} ${v.title} ${v.description}`.toLowerCase().includes(q)),
    }
  }
  const pattern = `%${query}%`
  const [profiles, threads, videos] = await Promise.all([
    supabase.from('profiles_public').select('*').or(`username.ilike.${pattern},display_name.ilike.${pattern},bio.ilike.${pattern}`).limit(12),
    supabase.from('threads_public').select('*').ilike('body', pattern).order('created_at', { ascending: false }).limit(20),
    supabase.from('videos_public').select('*').or(`title.ilike.${pattern},description.ilike.${pattern}`).order('created_at', { ascending: false }).limit(20),
  ])
  if (profiles.error) throw profiles.error
  if (threads.error) throw threads.error
  if (videos.error) throw videos.error
  return {
    profiles: (profiles.data ?? []).map(mapProfile),
    threads: (threads.data ?? []).map(mapThread),
    videos: (videos.data ?? []).map(mapVideo),
  }
}
