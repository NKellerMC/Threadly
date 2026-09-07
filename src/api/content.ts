import { auth } from '../lib/firebase'
import { requireSupabase } from '../lib/supabase'

function requireUserId(): string {
  const uid = auth?.currentUser?.uid
  if (!uid) throw new Error('Sua sessão expirou. Entre novamente.')
  return uid
}

async function removeStorage(bucket: string, paths: Array<string | null | undefined>): Promise<void> {
  const clean = [...new Set(paths.filter((path): path is string => Boolean(path)))]
  if (!clean.length) return
  const db = requireSupabase()
  const { error } = await db.storage.from(bucket).remove(clean)
  // A publicação já foi removida do banco. Um erro de limpeza não deve
  // ressuscitar conteúdo excluído; o objeto privado pode ser limpo depois.
  if (error) console.warn(`Falha ao limpar mídia de ${bucket}:`, error.message)
}

export async function deleteVideo(videoId: string): Promise<void> {
  const uid = requireUserId()
  const db = requireSupabase()
  const { data, error } = await db
    .from('videos')
    .select('storage_path,thumbnail_path')
    .eq('id', videoId)
    .eq('user_id', uid)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Clip não encontrado ou você não pode excluí-lo.')

  const { error: deleteError } = await db
    .from('videos')
    .delete()
    .eq('id', videoId)
    .eq('user_id', uid)
  if (deleteError) throw deleteError

  await Promise.all([
    removeStorage('videos', [data.storage_path ? String(data.storage_path) : null]),
    removeStorage('thumbnails', [data.thumbnail_path ? String(data.thumbnail_path) : null]),
  ])
}

export async function deleteThread(threadId: string): Promise<void> {
  const uid = requireUserId()
  const db = requireSupabase()
  const [threadResult, mediaResult] = await Promise.all([
    db.from('threads').select('image_path').eq('id', threadId).eq('user_id', uid).maybeSingle(),
    db.from('thread_media').select('storage_path').eq('thread_id', threadId),
  ])
  if (threadResult.error) throw threadResult.error
  if (mediaResult.error) throw mediaResult.error
  if (!threadResult.data) throw new Error('Thread não encontrada ou você não pode excluí-la.')

  const { error: deleteError } = await db
    .from('threads')
    .delete()
    .eq('id', threadId)
    .eq('user_id', uid)
  if (deleteError) throw deleteError

  await removeStorage('images', [
    threadResult.data.image_path ? String(threadResult.data.image_path) : null,
    ...(mediaResult.data ?? []).map(row => row.storage_path ? String(row.storage_path) : null),
  ])
}

export async function deleteThreadReply(replyId: string): Promise<void> {
  requireUserId()
  const db = requireSupabase()
  const { error } = await db.from('thread_replies').delete().eq('id', replyId)
  if (error) throw error
}
