import { requireSupabase } from './supabase'

const cache = new Map<string, { url: string; expiresAt: number }>()

export async function signedMediaUrl(bucket: string, path?: string | null, fallback?: string | null): Promise<string> {
  if (!path) return fallback ?? ''
  const key = `${bucket}:${path}`
  const now = Date.now()
  const cached = cache.get(key)
  if (cached && cached.expiresAt > now + 60_000) return cached.url

  const db = requireSupabase()
  const { data, error } = await db.storage.from(bucket).createSignedUrl(path, 60 * 60)
  if (error) throw error
  cache.set(key, { url: data.signedUrl, expiresAt: now + 55 * 60_000 })
  return data.signedUrl
}

export async function removeUserMedia(bucket: string, path?: string | null): Promise<void> {
  if (!path) return
  const db = requireSupabase()
  const { error } = await db.storage.from(bucket).remove([path])
  if (error) throw error
  cache.delete(`${bucket}:${path}`)
}

export function safeMediaExtension(file: File, fallback: string): string {
  const found = file.name.split('.').pop()?.toLowerCase()
  return found && /^[a-z0-9]+$/.test(found) ? found : fallback
}

export function userMediaPath(userId: string, file: File, fallback = 'bin'): string {
  const safeUid = userId.replace(/[^a-zA-Z0-9_-]/g, '_')
  return `${safeUid}/${crypto.randomUUID()}.${safeMediaExtension(file, fallback)}`
}

export async function uploadUserMedia(bucket: string, userId: string, file: File, fallbackExtension = 'bin'): Promise<string> {
  const db = requireSupabase()
  const path = userMediaPath(userId, file, fallbackExtension)
  const { error } = await db.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })
  if (error) throw error
  return path
}
