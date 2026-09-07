import { auth } from '../lib/firebase'
import { demoProfiles } from '../lib/demo'
import { requireSupabase, supabase } from '../lib/supabase'
import { supabaseConfigured } from '../lib/config'
import type { Profile } from '../lib/types'
import { mapProfile } from './mappers'
import { validateUsername } from '../lib/validation'

export async function syncProfile(params: {
  userId: string
  email?: string | null
  displayName?: string | null
  avatarUrl?: string | null
}): Promise<void> {
  if (!supabaseConfigured || !supabase) return
  const base = (params.email?.split('@')[0] || params.displayName || 'threader')
    .toLowerCase().replace(/[^a-z0-9_]+/g, '').slice(0, 18) || 'threader'
  const username = `${base}_${params.userId.slice(0, 5).toLowerCase()}`
  const { error } = await supabase.from('profiles').upsert({
    id: params.userId,
    username,
    display_name: params.displayName || base,
    avatar_url: params.avatarUrl || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })
  if (error) console.warn('Não foi possível sincronizar o perfil:', error.message)
}

export async function getProfile(userId?: string): Promise<Profile | null> {
  const id = userId ?? auth?.currentUser?.uid
  if (!id) return demoProfiles[0]
  if (!supabaseConfigured || !supabase) return demoProfiles.find(p => p.id === id) ?? demoProfiles[0]
  const { data, error } = await supabase.from('profiles_public').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? mapProfile(data) : null
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  if (!supabaseConfigured || !supabase) return demoProfiles.find(p => p.username === username) ?? null
  const { data, error } = await supabase.from('profiles_public').select('*').eq('username', username).maybeSingle()
  if (error) throw error
  return data ? mapProfile(data) : null
}

export async function updateProfile(input: { displayName: string; username: string; bio: string; website?: string }): Promise<void> {
  const uid = auth?.currentUser?.uid
  if (!uid) throw new Error('Entre na sua conta para editar o perfil.')
  const db = requireSupabase()
  const username = validateUsername(input.username)
  const { error } = await db.from('profiles').update({
    username,
    display_name: input.displayName.trim(),
    bio: input.bio.trim(),
    website: input.website?.trim() || null,
    updated_at: new Date().toISOString(),
  }).eq('id', uid)
  if (error) throw error
}
