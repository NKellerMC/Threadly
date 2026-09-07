import { auth } from '../lib/firebase'
import { requireSupabase } from '../lib/supabase'

export async function reportContent(params: { targetType: 'video' | 'thread' | 'profile'; targetId: string; reason: string; details?: string }): Promise<void> {
  const uid = auth?.currentUser?.uid
  if (!uid) throw new Error('Entre na sua conta para enviar uma denúncia.')
  const db = requireSupabase()
  const { error } = await db.from('reports').insert({ reporter_id: uid, target_type: params.targetType, target_id: params.targetId, reason: params.reason, details: params.details?.trim() || null })
  if (error) throw error
}
