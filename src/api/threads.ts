import { auth } from '../lib/firebase'
import { demoThreads } from '../lib/demo'
import { requireSupabase, supabase } from '../lib/supabase'
import { supabaseConfigured } from '../lib/config'
import type { ThreadPost, ThreadReply } from '../lib/types'
import { mapThread, mapThreadReply } from './mappers'
import { validateImageFile } from '../lib/validation'

async function decorate(posts: ThreadPost[]): Promise<ThreadPost[]> {
  const uid = auth?.currentUser?.uid
  if (!uid || !supabase || !posts.length) return posts
  const ids = posts.map(p => p.id)
  const [likes, saves] = await Promise.all([
    supabase.from('thread_likes').select('thread_id').eq('user_id', uid).in('thread_id', ids),
    supabase.from('thread_bookmarks').select('thread_id').eq('user_id', uid).in('thread_id', ids),
  ])
  const liked = new Set((likes.data ?? []).map(r => String(r.thread_id)))
  const saved = new Set((saves.data ?? []).map(r => String(r.thread_id)))
  return posts.map(p => ({ ...p, liked: liked.has(p.id), saved: saved.has(p.id) }))
}

export async function getThreads(options: { userId?: string; limit?: number; followingOnly?: boolean } = {}): Promise<ThreadPost[]> {
  if (!supabaseConfigured || !supabase) {
    return options.userId ? demoThreads.filter(p => p.userId === options.userId) : demoThreads
  }
  if (options.followingOnly && auth?.currentUser) {
    const { data: followRows } = await supabase.from('follows').select('following_id').eq('follower_id', auth.currentUser.uid)
    const ids = (followRows ?? []).map(r => String(r.following_id))
    if (!ids.length) return []
    const { data, error } = await supabase.from('threads_public').select('*').in('user_id', ids).order('created_at', { ascending: false }).limit(options.limit ?? 40)
    if (error) throw error
    return decorate((data ?? []).map(mapThread))
  }
  let query = supabase.from('threads_public').select('*').order('created_at', { ascending: false }).limit(options.limit ?? 40)
  if (options.userId) query = query.eq('user_id', options.userId)
  const { data, error } = await query
  if (error) throw error
  return decorate((data ?? []).map(mapThread))
}

export async function getThread(threadId: string): Promise<ThreadPost | null> {
  if (!supabaseConfigured || !supabase) return demoThreads.find(p => p.id === threadId) ?? null
  const { data, error } = await supabase.from('threads_public').select('*').eq('id', threadId).maybeSingle()
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
  if (!supabaseConfigured || !supabase) return []
  const { data, error } = await supabase.from('thread_replies_public').select('*').eq('thread_id', threadId).order('created_at', { ascending:true }).limit(200)
  if (error) throw error
  return (data ?? []).map(mapThreadReply)
}

export async function addThreadReply(threadId: string, body: string): Promise<ThreadReply> {
  const uid = auth?.currentUser?.uid
  if (!uid) throw new Error('Entre na sua conta para responder.')
  const text = body.trim()
  if (!text) throw new Error('Escreva uma resposta.')
  const db = requireSupabase()
  const { data, error } = await db.from('thread_replies').insert({ thread_id:threadId, user_id:uid, body:text }).select('id').single()
  if (error) throw error
  const { data: row, error: readError } = await db.from('thread_replies_public').select('*').eq('id', data.id).single()
  if (readError) throw readError
  return mapThreadReply(row)
}
