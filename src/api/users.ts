import { updateProfile as updateFirebaseProfile } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { requireSupabase } from '../lib/supabase'
import type { Profile } from '../lib/types'
import { normalizeUsername, validateUsername } from '../lib/validation'
import { mapProfile } from './mappers'

function friendlyUsernameError(error: { code?: string; message?: string } | null): Error {
  if (error?.code === '23505' || error?.message?.toLowerCase().includes('duplicate')) {
    return new Error('Esse @ já está em uso. Escolha outro nome de usuário.')
  }
  return new Error(error?.message || 'Não foi possível salvar o nome de usuário.')
}

export async function isUsernameAvailable(value: string, userId?: string | null): Promise<boolean> {
  const username = validateUsername(value)
  const db = requireSupabase()
  const { data, error } = await db.rpc('username_available', {
    p_username: username,
    p_user_id: userId ?? null,
  })
  if (error) throw error
  return data === true
}

async function generateAvailableUsername(params: {
  userId: string
  email?: string | null
  displayName?: string | null
}): Promise<string> {
  const raw = params.email?.split('@')[0] || params.displayName || 'threader'
  const base = normalizeUsername(raw).replace(/[._]+$/g, '').slice(0, 14) || 'threader'
  const uid = params.userId.toLowerCase().replace(/[^a-z0-9]/g, '')
  const candidates = [
    `${base}_${uid.slice(0, 5)}`,
    `${base}_${uid.slice(0, 8)}`,
    `threader_${uid.slice(0, 12)}`,
  ].map(candidate => normalizeUsername(candidate))

  for (const candidate of candidates) {
    if (candidate.length >= 3 && await isUsernameAvailable(candidate, params.userId)) return candidate
  }

  throw new Error('Não foi possível reservar um nome de usuário para esta conta.')
}

export async function syncProfile(params: {
  userId: string
  email?: string | null
  displayName?: string | null
  avatarUrl?: string | null
  preferredUsername?: string | null
}): Promise<void> {
  const db = requireSupabase()
  const { data: existing, error: existingError } = await db
    .from('profiles')
    .select('id')
    .eq('id', params.userId)
    .maybeSingle()

  if (existingError) throw existingError
  if (existing) return

  let username: string
  if (params.preferredUsername) {
    username = validateUsername(params.preferredUsername)
    if (!await isUsernameAvailable(username, params.userId)) {
      throw new Error('Esse @ já está em uso. Escolha outro nome de usuário.')
    }
  } else {
    username = await generateAvailableUsername(params)
  }

  const displayName = params.displayName?.trim() || 'Threader'
  const { error } = await db.from('profiles').insert({
    id: params.userId,
    username,
    display_name: displayName,
    avatar_url: params.avatarUrl || null,
  })
  if (error) throw friendlyUsernameError(error)
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
  const normalized = normalizeUsername(username)
  const { data, error } = await db.from('profiles_public').select('*').eq('username', normalized).maybeSingle()
  if (error) throw error
  return data ? mapProfile(data) : null
}

export async function updateProfile(input: { displayName: string; username: string; bio: string; website?: string }): Promise<void> {
  const currentUser = auth?.currentUser
  if (!currentUser) throw new Error('Sua sessão expirou. Entre novamente para editar o perfil.')

  const displayName = input.displayName.trim()
  if (!displayName) throw new Error('Digite um nome para o perfil.')

  const username = validateUsername(input.username)
  if (!await isUsernameAvailable(username, currentUser.uid)) {
    throw new Error('Esse @ já está em uso. Escolha outro nome de usuário.')
  }

  const db = requireSupabase()
  const { error } = await db.from('profiles').update({
    username,
    display_name: displayName,
    bio: input.bio.trim(),
    website: input.website?.trim() || null,
    updated_at: new Date().toISOString(),
  }).eq('id', currentUser.uid)

  if (error) throw friendlyUsernameError(error)

  if (currentUser.displayName !== displayName) {
    await updateFirebaseProfile(currentUser, { displayName })
  }
}
