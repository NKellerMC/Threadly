import { auth } from '../lib/firebase'
import { demoConversations, demoMessages } from '../lib/demo'
import { requireSupabase, supabase } from '../lib/supabase'
import { supabaseConfigured } from '../lib/config'
import type { ChatMessage, ConversationSummary } from '../lib/types'

export async function getConversations(): Promise<ConversationSummary[]> {
  const uid = auth?.currentUser?.uid
  if (!uid || !supabaseConfigured || !supabase) return demoConversations
  const { data, error } = await supabase.rpc('list_conversations', { p_user_id: uid })
  if (error) throw error
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id), participantId: String(row.participant_id), participantUsername: String(row.participant_username ?? 'threader'),
    participantName: String(row.participant_name ?? 'Threader'), participantAvatarUrl: row.participant_avatar_url ? String(row.participant_avatar_url) : null,
    lastMessage: String(row.last_message ?? ''), lastMessageAt: String(row.last_message_at ?? new Date().toISOString()), unread: Number(row.unread ?? 0),
  }))
}

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  const uid = auth?.currentUser?.uid
  if (!uid || !supabaseConfigured || !supabase) return demoMessages[conversationId] ?? []
  const { data, error } = await supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true }).limit(200)
  if (error) throw error
  return (data ?? []).map(row => ({ id:String(row.id), conversationId:String(row.conversation_id), senderId:String(row.sender_id), body:String(row.body), createdAt:String(row.created_at) }))
}

export async function sendMessage(conversationId: string, body: string): Promise<void> {
  const uid = auth?.currentUser?.uid
  if (!uid) throw new Error('Entre na sua conta para enviar mensagens.')
  const db = requireSupabase()
  const { error } = await db.from('messages').insert({ conversation_id: conversationId, sender_id: uid, body: body.trim() })
  if (error) throw error
}

export async function startConversation(targetUserId: string): Promise<string> {
  const uid = auth?.currentUser?.uid
  if (!uid) throw new Error('Entre na sua conta para enviar mensagens.')
  if (!supabaseConfigured || !supabase) return demoConversations.find(c => c.participantId === targetUserId)?.id ?? demoConversations[0].id
  const db = requireSupabase()
  const { data, error } = await db.rpc('start_direct_conversation', { p_other_user_id: targetUserId })
  if (error) throw error
  return String(data)
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const uid = auth?.currentUser?.uid
  if (!uid || !supabaseConfigured || !supabase) return
  const db = supabase
  const { error } = await db
    .from('conversation_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', uid)
  if (error) throw error
}

export function subscribeToMessages(conversationId: string, onMessage: (message: ChatMessage) => void): () => void {
  if (!supabaseConfigured || !supabase) return () => undefined
  const db = supabase
  const channel = db.channel(`conversation:${conversationId}`)
    .on('postgres_changes', { event:'INSERT', schema:'public', table:'messages', filter:`conversation_id=eq.${conversationId}` }, (payload) => {
      const row = payload.new as Record<string, unknown>
      onMessage({ id:String(row.id), conversationId:String(row.conversation_id), senderId:String(row.sender_id), body:String(row.body), createdAt:String(row.created_at) })
    })
    .subscribe()
  return () => { void db.removeChannel(channel) }
}
