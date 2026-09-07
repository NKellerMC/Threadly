import { auth } from '../lib/firebase'
import { signedMediaUrl, userMediaPath } from '../lib/media'
import { requireSupabase } from '../lib/supabase'
import type { Audience, MediaEditState, ThreadMedia, ThreadPost, ThreadReply } from '../lib/types'
import { validateImageFile, validateVideoFile } from '../lib/validation'
import { mapThread, mapThreadReply } from './mappers'

async function hydrateMedia(posts: ThreadPost[]): Promise<ThreadPost[]> {
  if (!posts.length) return posts
  const db = requireSupabase()
  const ids = posts.map(p => p.id)
  const { data: mediaRows, error } = await db.from('thread_media').select('*').in('thread_id', ids).order('position', { ascending:true })
  if (error) throw error
  const byThread = new Map<string, ThreadMedia[]>()
  for (const row of mediaRows ?? []) {
    const path = String(row.storage_path)
    const item: ThreadMedia = {
      id: String(row.id),
      type: String(row.media_type) as ThreadMedia['type'],
      storagePath: path,
      url: await signedMediaUrl('images', path),
      position: Number(row.position ?? 0),
      altText: String(row.alt_text ?? ''),
      editMetadata: row.edit_metadata && typeof row.edit_metadata === 'object' ? row.edit_metadata as MediaEditState : undefined,
    }
    const key = String(row.thread_id); const current = byThread.get(key) ?? []; current.push(item); byThread.set(key,current)
  }
  return Promise.all(posts.map(async post => {
    const imageUrl = post.imagePath ? await signedMediaUrl('images', post.imagePath, post.imageUrl) : post.imageUrl
    return { ...post, imageUrl: imageUrl || null, media: byThread.get(post.id) ?? [] }
  }))
}

async function decorate(posts: ThreadPost[]): Promise<ThreadPost[]> {
  const hydrated = await hydrateMedia(posts)
  const uid = auth?.currentUser?.uid
  if (!uid || !hydrated.length) return hydrated
  const db = requireSupabase(); const ids = hydrated.map(p => p.id)
  const [likes, saves, reposts] = await Promise.all([
    db.from('thread_likes').select('thread_id').eq('user_id', uid).in('thread_id', ids),
    db.from('thread_bookmarks').select('thread_id').eq('user_id', uid).in('thread_id', ids),
    db.from('reposts').select('target_id').eq('user_id', uid).eq('target_type','thread').in('target_id', ids),
  ])
  if (likes.error) throw likes.error; if (saves.error) throw saves.error; if (reposts.error) throw reposts.error
  const liked = new Set((likes.data ?? []).map(r => String(r.thread_id)))
  const saved = new Set((saves.data ?? []).map(r => String(r.thread_id)))
  const reposted = new Set((reposts.data ?? []).map(r => String(r.target_id)))
  return hydrated.map(p => ({ ...p, liked: liked.has(p.id), saved: saved.has(p.id), reposted: reposted.has(p.id) }))
}

export async function getThreads(options: { userId?: string; limit?: number; followingOnly?: boolean } = {}): Promise<ThreadPost[]> {
  const db = requireSupabase()
  if (options.followingOnly) {
    const uid = auth?.currentUser?.uid; if (!uid) throw new Error('Sua sessão expirou. Entre novamente.')
    const { data: followRows, error: followError } = await db.from('follows').select('following_id').eq('follower_id', uid)
    if (followError) throw followError
    const ids = (followRows ?? []).map(r => String(r.following_id)); if (!ids.length) return []
    const { data, error } = await db.from('threads_public').select('*').in('user_id', ids).order('created_at', { ascending:false }).limit(options.limit ?? 40)
    if (error) throw error
    return decorate((data ?? []).map(mapThread))
  }
  let query = db.from('threads_public').select('*').order('created_at', { ascending:false }).limit(options.limit ?? 40)
  if (options.userId) query = query.eq('user_id', options.userId)
  const { data, error } = await query; if (error) throw error
  return decorate((data ?? []).map(mapThread))
}

export async function getThread(threadId: string): Promise<ThreadPost | null> {
  const db = requireSupabase(); const { data, error } = await db.from('threads_public').select('*').eq('id', threadId).maybeSingle()
  if (error) throw error
  return data ? (await decorate([mapThread(data)]))[0] : null
}

type ThreadMediaInput = { file: File; editMetadata?: MediaEditState; altText?: string }
export async function createThread(userId: string, body: string, media?: File | File[] | ThreadMediaInput[] | null, options: {
  audience?: Audience; commentsEnabled?: boolean; commentPolicy?: 'everyone'|'following'|'none'; locationName?: string
} = {}): Promise<void> {
  const db = requireSupabase()
  const raw = !media ? [] : Array.isArray(media) ? media : [media]
  const items: ThreadMediaInput[] = raw.map(item => item instanceof File ? {file:item} : item)
  if (items.length > 10) throw new Error('Um carrossel pode ter no máximo 10 mídias.')
  const uploaded: string[] = []
  try {
    const { data: inserted, error: insertError } = await db.from('threads').insert({
      user_id:userId, body, image_url:null, image_path:null,
      audience:options.audience ?? 'public', comments_enabled:options.commentsEnabled ?? true,
      comment_policy:options.commentPolicy ?? 'everyone', location_name:options.locationName?.trim() || null,
    }).select('id').single()
    if (insertError) throw insertError
    for (let index=0; index<items.length; index++) {
      const { file, editMetadata, altText } = items[index]
      const isVideo = file.type.startsWith('video/')
      if (isVideo) validateVideoFile(file); else validateImageFile(file)
      const path = userMediaPath(userId,file,isVideo?'mp4':'jpg')
      const { error: uploadError } = await db.storage.from('images').upload(path,file,{cacheControl:'86400',upsert:false,contentType:file.type})
      if (uploadError) throw uploadError
      uploaded.push(path)
      const { error: mediaError } = await db.from('thread_media').insert({thread_id:inserted.id,media_type:isVideo?'video':'image',storage_path:path,position:index,alt_text:altText?.trim()||'',edit_metadata:editMetadata??{}})
      if (mediaError) throw mediaError
    }
  } catch (error) {
    if (uploaded.length) await db.storage.from('images').remove(uploaded)
    throw error
  }
}

export async function editThread(threadId: string, body: string, settings?: { commentsEnabled?: boolean; commentPolicy?: 'everyone'|'following'|'none'; locationName?: string }): Promise<void> {
  const uid=auth?.currentUser?.uid; if(!uid) throw new Error('Sua sessão expirou.')
  const db=requireSupabase(); const {error}=await db.from('threads').update({body:body.trim(),edited_at:new Date().toISOString(),...(settings??{})}).eq('id',threadId).eq('user_id',uid)
  if(error) throw error
}

export async function getThreadReplies(threadId: string): Promise<ThreadReply[]> {
  const db = requireSupabase(); const { data, error } = await db.from('thread_replies_public').select('*').eq('thread_id', threadId).order('created_at', { ascending:true }).limit(200)
  if (error) throw error
  return (data ?? []).map(mapThreadReply)
}

export async function addThreadReply(threadId: string, body: string, replyToId?: string | null): Promise<ThreadReply> {
  const uid = auth?.currentUser?.uid; if (!uid) throw new Error('Sua sessão expirou. Entre novamente para responder.')
  const text = body.trim(); if (!text) throw new Error('Escreva uma resposta.')
  const db = requireSupabase(); const { data, error } = await db.from('thread_replies').insert({ thread_id:threadId, user_id:uid, body:text, reply_to_id:replyToId??null }).select('id').single()
  if (error) throw error
  const { data: row, error: readError } = await db.from('thread_replies_public').select('*').eq('id', data.id).single(); if (readError) throw readError
  return mapThreadReply(row)
}
