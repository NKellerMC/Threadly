import { auth } from '../lib/firebase'
import { signedMediaUrl, userMediaPath } from '../lib/media'
import { requireSupabase } from '../lib/supabase'
import type { ChatMessage, ConversationSummary, MessageAttachment, MessageReaction } from '../lib/types'

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
    body: String(row.body ?? ''),
    createdAt: String(row.created_at),
    replyToId: row.reply_to_id ? String(row.reply_to_id) : null,
    editedAt: row.edited_at ? String(row.edited_at) : null,
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
    sharedType: row.shared_type ? String(row.shared_type) as ChatMessage['sharedType'] : null,
    sharedId: row.shared_id ? String(row.shared_id) : null,
  }
}

async function hydrateMessages(messages: ChatMessage[]): Promise<ChatMessage[]> {
  if (!messages.length) return messages
  const db=requireSupabase();const ids=messages.map(m=>m.id)
  const [reactions,attachments]=await Promise.all([
    db.from('message_reactions').select('message_id,user_id,emoji').in('message_id',ids),
    db.from('message_attachments').select('*').in('message_id',ids).order('created_at',{ascending:true}),
  ])
  if(reactions.error)throw reactions.error;if(attachments.error)throw attachments.error
  const reactionMap=new Map<string,MessageReaction[]>();for(const row of reactions.data??[]){const key=String(row.message_id);const current=reactionMap.get(key)??[];current.push({userId:String(row.user_id),emoji:String(row.emoji)});reactionMap.set(key,current)}
  const attachmentMap=new Map<string,MessageAttachment[]>();for(const row of attachments.data??[]){const key=String(row.message_id);const path=String(row.storage_path);const current=attachmentMap.get(key)??[];current.push({id:String(row.id),mediaType:String(row.media_type) as MessageAttachment['mediaType'],storagePath:path,url:await signedMediaUrl('dm',path),fileName:row.file_name?String(row.file_name):null,mimeType:row.mime_type?String(row.mime_type):null,sizeBytes:row.size_bytes?Number(row.size_bytes):null});attachmentMap.set(key,current)}
  return messages.map(message=>({...message,reactions:reactionMap.get(message.id)??[],attachments:attachmentMap.get(message.id)??[]}))
}

export async function getConversations(): Promise<ConversationSummary[]> {
  const uid = requireUserId(); const db = requireSupabase(); const { data, error } = await db.rpc('list_conversations', { p_user_id: uid }); if (error) throw error
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id), participantId: String(row.participant_id ?? ''), participantUsername: String(row.participant_username ?? ''), participantName: String(row.participant_name ?? row.title ?? 'Grupo'), participantAvatarUrl: row.participant_avatar_url ? String(row.participant_avatar_url) : null,
    title: row.title ? String(row.title) : null, kind: String(row.kind ?? 'direct') as ConversationSummary['kind'], lastMessage: String(row.last_message ?? ''), lastMessageAt: String(row.last_message_at ?? new Date().toISOString()), unread: Number(row.unread ?? 0), requestState: String(row.request_state ?? 'accepted') as ConversationSummary['requestState'], pinned: Boolean(row.pinned_at),
  }))
}

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  requireUserId(); const db = requireSupabase(); const { data, error } = await db.from('messages').select('id,conversation_id,sender_id,body,created_at,reply_to_id,edited_at,deleted_at,shared_type,shared_id').eq('conversation_id', conversationId).order('created_at', { ascending: true }).limit(500)
  if (error) throw error
  return hydrateMessages((data ?? []).map(row => mapMessage(row as Record<string, unknown>)))
}

function attachmentType(file:File):MessageAttachment['mediaType']{if(file.type.startsWith('image/'))return'image';if(file.type.startsWith('video/'))return'video';if(file.type.startsWith('audio/'))return'audio';return'file'}

export async function sendMessage(conversationId: string, body: string, options: { replyToId?:string|null; sharedType?:ChatMessage['sharedType']; sharedId?:string|null; attachment?:File|null } = {}): Promise<ChatMessage> {
  const uid = requireUserId(); const text = body.trim(); if (!text && !options.sharedType && !options.attachment) throw new Error('Escreva uma mensagem ou escolha algo para enviar.')
  const db = requireSupabase(); const { data, error } = await db.from('messages').insert({ conversation_id: conversationId, sender_id: uid, body: text, reply_to_id:options.replyToId??null, shared_type:options.sharedType??null, shared_id:options.sharedId??null }).select('id,conversation_id,sender_id,body,created_at,reply_to_id,edited_at,deleted_at,shared_type,shared_id').single()
  if (error) throw error
  const message=mapMessage(data as Record<string,unknown>)
  if(options.attachment){
    const file=options.attachment;if(file.size>200*1024*1024)throw new Error('O anexo pode ter no máximo 200 MB.')
    const path=userMediaPath(uid,file,'bin');const{error:uploadError}=await db.storage.from('dm').upload(path,file,{upsert:false,contentType:file.type||'application/octet-stream'});if(uploadError){await db.rpc('unsend_message',{p_message_id:message.id});throw uploadError}
    const{error:attachmentError}=await db.from('message_attachments').insert({message_id:message.id,user_id:uid,media_type:attachmentType(file),storage_path:path,file_name:file.name,mime_type:file.type||null,size_bytes:file.size});if(attachmentError){await db.storage.from('dm').remove([path]);await db.rpc('unsend_message',{p_message_id:message.id});throw attachmentError}
  }
  return (await hydrateMessages([message]))[0]
}

export async function startConversation(targetUserId: string): Promise<string> { requireUserId(); const db=requireSupabase();const{data,error}=await db.rpc('start_direct_conversation',{p_other_user_id:targetUserId});if(error)throw error;return String(data) }
export async function createGroup(title:string,memberIds:string[]):Promise<string>{const db=requireSupabase();const{data,error}=await db.rpc('create_group_conversation',{p_title:title,p_member_ids:memberIds});if(error)throw error;return String(data)}
export async function acceptMessageRequest(conversationId:string,accept:boolean):Promise<void>{const db=requireSupabase();const{error}=await db.rpc('accept_message_request',{p_conversation_id:conversationId,p_accept:accept});if(error)throw error}
export async function editMessage(messageId:string,body:string):Promise<void>{const db=requireSupabase();const{error}=await db.rpc('edit_message',{p_message_id:messageId,p_body:body});if(error)throw error}
export async function unsendMessage(messageId:string):Promise<void>{const db=requireSupabase();const{error}=await db.rpc('unsend_message',{p_message_id:messageId});if(error)throw error}
export async function reactToMessage(messageId:string,emoji:string,current?:string):Promise<void>{const me=requireUserId();const db=requireSupabase();if(current===emoji){const{error}=await db.from('message_reactions').delete().eq('message_id',messageId).eq('user_id',me);if(error)throw error;return}const{error}=await db.from('message_reactions').upsert({message_id:messageId,user_id:me,emoji},{onConflict:'message_id,user_id'});if(error)throw error}

export async function markConversationRead(conversationId: string): Promise<void> { const uid=requireUserId();const db=requireSupabase();const{error}=await db.from('conversation_members').update({last_read_at:new Date().toISOString()}).eq('conversation_id',conversationId).eq('user_id',uid);if(error)throw error }
export async function pinConversation(conversationId:string,pinned:boolean):Promise<void>{const me=requireUserId();const db=requireSupabase();const{error}=await db.from('conversation_members').update({pinned_at:pinned?new Date().toISOString():null}).eq('conversation_id',conversationId).eq('user_id',me);if(error)throw error}

export function subscribeToMessages(conversationId: string, onMessage: (message: ChatMessage) => void, onError?: (message: string) => void): () => void {
  const db = requireSupabase(); const channel = db.channel(`messages-db:${conversationId}:${crypto.randomUUID()}`).on('postgres_changes', { event:'INSERT', schema:'public', table:'messages', filter:`conversation_id=eq.${conversationId}` }, payload => { void hydrateMessages([mapMessage(payload.new as Record<string,unknown>)]).then(([message])=>onMessage(message)).catch(()=>undefined) }).on('postgres_changes',{event:'UPDATE',schema:'public',table:'messages',filter:`conversation_id=eq.${conversationId}`},()=>onError?.('Mensagem atualizada.')).subscribe(status => {if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')onError?.('A conexão em tempo real foi interrompida. Tentando recuperar…')})
  return () => { void db.removeChannel(channel) }
}

export function subscribeToInbox(onChange: () => void): () => void { requireUserId();const db=requireSupabase();const channel=db.channel(`inbox:${crypto.randomUUID()}`).on('postgres_changes',{event:'*',schema:'public',table:'messages'},()=>onChange()).on('postgres_changes',{event:'*',schema:'public',table:'conversation_members'},()=>onChange()).subscribe();return()=>{void db.removeChannel(channel)} }

export function connectConversationSignals(conversationId:string,handlers:{onTyping?:(typing:boolean)=>void;onOnline?:(online:boolean)=>void}){
  const me=requireUserId();const db=requireSupabase();const channel=db.channel(`conversation:${conversationId}`,{config:{private:true,presence:{key:me}}})
    .on('broadcast',{event:'typing'},payload=>{if(String(payload.payload?.userId)!==me)handlers.onTyping?.(Boolean(payload.payload?.typing))})
    .on('presence',{event:'sync'},()=>{const state=channel.presenceState();const online=Object.keys(state).some(key=>key!==me);handlers.onOnline?.(online)})
    .subscribe(async status=>{if(status==='SUBSCRIBED')await channel.track({userId:me,onlineAt:new Date().toISOString()})})
  let timer:number|undefined
  return{
    setTyping(typing:boolean){void channel.send({type:'broadcast',event:'typing',payload:{userId:me,typing}});if(timer)window.clearTimeout(timer);if(typing)timer=window.setTimeout(()=>void channel.send({type:'broadcast',event:'typing',payload:{userId:me,typing:false}}),1800)},
    dispose(){if(timer)window.clearTimeout(timer);void db.removeChannel(channel)},
  }
}
