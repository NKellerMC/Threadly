import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { auth } from './firebase'
import { env, supabaseConfigured } from './config'

let client: SupabaseClient | null = null
if (supabaseConfigured) {
  client = createClient(env.supabase.url, env.supabase.key, {
    accessToken: async () => {
      const currentUser = auth?.currentUser
      return currentUser ? currentUser.getIdToken(false) : null
    },
  })
}

export const supabase = client
export function requireSupabase(): SupabaseClient {
  if (!client) throw new Error('Supabase ainda não foi configurado para este deploy.')
  return client
}
