import { auth } from '../lib/firebase'
import { requireSupabase } from '../lib/supabase'
import type { ChatMessage, ConversationSummary } from '../lib/types'

function requireUserId(): string {
  const uid = auth?.currentUser?.uid
  if (!uid) throw new Error('Sua sessão expirou. Entre novamente para continuar.')
  return uid
}

function mapMessage(row: Record<string, unknown>): ChatMessage {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    senderId: String(row.sender_id),
    body: String(row.body),
    createdAt: String(row.created_at),
  }
}

export async function getConversations(): Promise<ConversationSummary[]> {
  const uid = requireUserId()
  const db = requireSupabase()
  const { data, error } = await db.rpc('list_conversations', { p_user_id: uid })
  if (error) throw error
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    participantId: String(row.participant_id),
    participantUsername: String(row.participant_username ?? 'threader'),
    participantName: String(row.participant_name ?? 'Threader'),
    participantAvatarUrl: row.participant_avatar_url ? String(row.participant_avatar_url) : null,
    lastMessage: String(row.last_message ?? ''),
    lastMessageAt: String(row.last_message_at ?? new Date().toISOString()),
    unread: Number(row.unread ?? 0),
  }))
}

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  requireUserId()
  const db = requireSupabase()
  const { data, error } = await db
    .from('messages')
    .select('id,conversation_id,sender_id,body,created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(300)
  if (error) throw error
  return (data ?? []).map(row => mapMessage(row as Record<string, unknown>))
}

export async function sendMessage(conversationId: string, body: string): Promise<ChatMessage> {
  const uid = requireUserId()
  const text = body.trim()
  if (!text) throw new Error('Escreva uma mensagem antes de enviar.')
  const db = requireSupabase()
  const { data, error } = await db
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: uid, body: text })
    .select('id,conversation_id,sender_id,body,created_at')
    .single()
  if (error) throw error
  return mapMessage(data as Record<string, unknown>)
}

export async function startConversation(targetUserId: string): Promise<string> {
  requireUserId()
  const db = requireSupabase()
  const { data, error } = await db.rpc('start_direct_conversation', { p_other_user_id: targetUserId })
  if (error) throw error
  return String(data)
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const uid = requireUserId()
  const db = requireSupabase()
  const { error } = await db
    .from('conversation_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', uid)
  if (error) throw error
}

export function subscribeToMessages(conversationId: string, onMessage: (message: ChatMessage) => void, onError?: (message: string) => void): () => void {
  const db = requireSupabase()
  const channel = db.channel(`conversation:${conversationId}:${crypto.randomUUID()}`)
    .on('postgres_changes', { event:'INSERT', schema:'public', table:'messages', filter:`conversation_id=eq.${conversationId}` }, payload => {
      onMessage(mapMessage(payload.new as Record<string, unknown>))
    })
    .subscribe(status => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') onError?.('A conexão em tempo real foi interrompida. Tentando recuperar…')
    })
  return () => { void db.removeChannel(channel) }
}

export function subscribeToInbox(onChange: () => void): () => void {
  requireUserId()
  const db = requireSupabase()
  const channel = db.channel(`inbox:${crypto.randomUUID()}`)
    .on('postgres_changes', { event:'INSERT', schema:'public', table:'messages' }, () => onChange())
    .subscribe()
  return () => { void db.removeChannel(channel) }
}
