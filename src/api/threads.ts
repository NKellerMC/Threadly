import { auth } from '../lib/firebase'
import { requireSupabase } from '../lib/supabase'
import type { ThreadPost, ThreadReply } from '../lib/types'
import { validateImageFile } from '../lib/validation'
import { mapThread, mapThreadReply } from './mappers'

async function decorate(posts: ThreadPost[]): Promise<ThreadPost[]> {
  const uid = auth?.currentUser?.uid
  if (!uid || !posts.length) return posts
  const db = requireSupabase()
  const ids = posts.map(p => p.id)
  const [likes, saves] = await Promise.all([
    db.from('thread_likes').select('thread_id').eq('user_id', uid).in('thread_id', ids),
    db.from('thread_bookmarks').select('thread_id').eq('user_id', uid).in('thread_id', ids),
  ])
  if (likes.error) throw likes.error
  if (saves.error) throw saves.error
  const liked = new Set((likes.data ?? []).map(r => String(r.thread_id)))
  const saved = new Set((saves.data ?? []).map(r => String(r.thread_id)))
  return posts.map(p => ({ ...p, liked: liked.has(p.id), saved: saved.has(p.id) }))
}

export async function getThreads(options: { userId?: string; limit?: number; followingOnly?: boolean } = {}): Promise<ThreadPost[]> {
  const db = requireSupabase()
  if (options.followingOnly) {
    const uid = auth?.currentUser?.uid
    if (!uid) throw new Error('Sua sessão expirou. Entre novamente.')
    const { data: followRows, error: followError } = await db.from('follows').select('following_id').eq('follower_id', uid)
    if (followError) throw followError
    const ids = (followRows ?? []).map(r => String(r.following_id))
    if (!ids.length) return []
    const { data, error } = await db.from('threads_public').select('*').in('user_id', ids).order('created_at', { ascending: false }).limit(options.limit ?? 40)
    if (error) throw error
    return decorate((data ?? []).map(mapThread))
  }

  let query = db.from('threads_public').select('*').order('created_at', { ascending: false }).limit(options.limit ?? 40)
  if (options.userId) query = query.eq('user_id', options.userId)
  const { data, error } = await query
  if (error) throw error
  return decorate((data ?? []).map(mapThread))
}

export async function getThread(threadId: string): Promise<ThreadPost | null> {
  const db = requireSupabase()
  const { data, error } = await db.from('threads_public').select('*').eq('id', threadId).maybeSingle()
  if (error) throw error
  return data ? (await decorate([mapThread(data)]))[0] : null
}

export async function createThread(userId: string, body: string, image?: File | null): Promise<void> {
  const db = requireSupabase()
  let imagePath: string | null = null
  let imageUrl: string | null = null
  if (image) {
    validateImageFile(image)
    const ext = image.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    imagePath = `${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}/${crypto.randomUUID()}.${ext}`
    const { error: uploadError } = await db.storage.from('images').upload(imagePath, image, { cacheControl:'86400', upsert:false, contentType:image.type })
    if (uploadError) throw uploadError
    imageUrl = db.storage.from('images').getPublicUrl(imagePath).data.publicUrl
  }
  const { error } = await db.from('threads').insert({ user_id: userId, body, image_url: imageUrl, image_path: imagePath })
  if (error) {
    if (imagePath) await db.storage.from('images').remove([imagePath])
    throw error
  }
}

export async function getThreadReplies(threadId: string): Promise<ThreadReply[]> {
  const db = requireSupabase()
  const { data, error } = await db.from('thread_replies_public').select('*').eq('thread_id', threadId).order('created_at', { ascending:true }).limit(200)
  if (error) throw error
  return (data ?? []).map(mapThreadReply)
}

export async function addThreadReply(threadId: string, body: string): Promise<ThreadReply> {
  const uid = auth?.currentUser?.uid
  if (!uid) throw new Error('Sua sessão expirou. Entre novamente para responder.')
  const text = body.trim()
  if (!text) throw new Error('Escreva uma resposta.')
  const db = requireSupabase()
  const { data, error } = await db.from('thread_replies').insert({ thread_id:threadId, user_id:uid, body:text }).select('id').single()
  if (error) throw error
  const { data: row, error: readError } = await db.from('thread_replies_public').select('*').eq('id', data.id).single()
  if (readError) throw readError
  return mapThreadReply(row)
}
