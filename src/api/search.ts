import { requireSupabase } from '../lib/supabase'
import type { SearchResults } from '../lib/types'
import { mapProfile, mapThread, mapVideo } from './mappers'

export async function searchEverything(raw: string): Promise<SearchResults> {
  const query = raw.trim().replace(/[%_]/g, '')
  if (!query) return { profiles: [], threads: [], videos: [] }

  const db = requireSupabase()
  const pattern = `%${query}%`
  const [profiles, threads, videos] = await Promise.all([
    db.from('profiles_public').select('*').or(`username.ilike.${pattern},display_name.ilike.${pattern},bio.ilike.${pattern}`).limit(12),
    db.from('threads_public').select('*').ilike('body', pattern).order('created_at', { ascending: false }).limit(20),
    db.from('videos_public').select('*').or(`title.ilike.${pattern},description.ilike.${pattern}`).order('created_at', { ascending: false }).limit(20),
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
