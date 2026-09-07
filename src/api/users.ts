import { auth } from '../lib/firebase'
import { requireSupabase } from '../lib/supabase'
import type { Profile } from '../lib/types'
import { validateUsername } from '../lib/validation'
import { mapProfile } from './mappers'

export async function syncProfile(params: {
  userId: string
  email?: string | null
  displayName?: string | null
  avatarUrl?: string | null
}): Promise<void> {
  const db = requireSupabase()
  const base = (params.email?.split('@')[0] || params.displayName || 'threader')
    .toLowerCase().replace(/[^a-z0-9_]+/g, '').slice(0, 18) || 'threader'
  const username = `${base}_${params.userId.slice(0, 5).toLowerCase()}`
  const { error } = await db.from('profiles').upsert({
    id: params.userId,
    username,
    display_name: params.displayName || base,
    avatar_url: params.avatarUrl || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })
  if (error) throw error
}

export async function getProfile(userId?: string): Promise<Profile | null> {
  const id = userId ?? auth?.currentUser?.uid
  if (!id) return null
  const db = requireSupabase()
  const { data, error } = await db.from('profiles_public').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? mapProfile(data) : null
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const db = requireSupabase()
  const { data, error } = await db.from('profiles_public').select('*').eq('username', username).maybeSingle()
  if (error) throw error
  return data ? mapProfile(data) : null
}

export async function updateProfile(input: { displayName: string; username: string; bio: string; website?: string }): Promise<void> {
  const uid = auth?.currentUser?.uid
  if (!uid) throw new Error('Sua sessão expirou. Entre novamente para editar o perfil.')
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
