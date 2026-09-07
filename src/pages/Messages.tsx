import { Loader2, MessageCircleMore, Send } from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import EmptyState from '../components/EmptyState'
import { getConversations, getMessages, markConversationRead, sendMessage, subscribeToMessages } from '../api/messages'
import { useAuth } from '../context/AuthContext'
import type { ChatMessage, ConversationSummary } from '../lib/types'
import { relativeTime } from '../lib/time'

export default function Messages(){
  const{user}=useAuth();const[params,setParams]=useSearchParams();const[conversations,setConversations]=useState<ConversationSummary[]>([]);const[messages,setMessages]=useState<ChatMessage[]>([]);const[body,setBody]=useState('');const[loading,setLoading]=useState(true);const[sending,setSending]=useState(false);const[status,setStatus]=useState('')
  const activeId=params.get('chat')??conversations[0]?.id??'';const active=useMemo(()=>conversations.find(c=>c.id===activeId),[conversations,activeId])
  useEffect(()=>{void getConversations().then(list=>{setConversations(list);if(!params.get('chat')&&list[0])setParams({chat:list[0].id},{replace:true})}).finally(()=>setLoading(false))},[])
  useEffect(()=>{if(!activeId)return;setMessages([]);void getMessages(activeId).then(list=>{setMessages(list);return markConversationRead(activeId)}).then(()=>setConversations(list=>list.map(c=>c.id===activeId?{...c,unread:0}:c))).catch(e=>setStatus(e instanceof Error?e.message:'Falha ao carregar mensagens.'));return subscribeToMessages(activeId,m=>{setMessages(list=>list.some(x=>x.id===m.id)?list:[...list,m]);if(m.senderId!==user?.uid)void markConversationRead(activeId)})},[activeId,user?.uid])
  const submit=async(e:FormEvent)=>{e.preventDefault();if(!activeId||!body.trim())return;setSending(true);setStatus('');try{await sendMessage(activeId,body);setBody('')}catch(error){setStatus(error instanceof Error?error.message:'Falha ao enviar.')}finally{setSending(false)}}
  if(loading)return <div className="page"><div className="center-status"><Loader2 className="spin"/> carregando conversas</div></div>
  if(!conversations.length)return <div className="page"><header className="page-header"><div><span className="eyebrow">Direto</span><h1>Mensagens</h1></div></header><EmptyState icon={<MessageCircleMore/>} title="Nenhuma conversa ainda.">Abra um perfil e toque em Mensagem.</EmptyState></div>
  return <div className="messages-layout"><aside className="conversation-list"><div className="conversation-title"><span className="eyebrow">Direto</span><h1>Mensagens</h1></div>{conversations.map(c=><button key={c.id} className={c.id===activeId?'active':''} onClick={()=>setParams({chat:c.id})}><Avatar name={c.participantName} src={c.participantAvatarUrl}/><div><strong>{c.participantName}</strong><span>{c.lastMessage}</span><small>{relativeTime(c.lastMessageAt)}</small></div>{c.unread>0&&<b>{c.unread}</b>}</button>)}</aside><section className="chat-pane">{active&&<header className="chat-head"><Avatar name={active.participantName} src={active.participantAvatarUrl}/><div><strong>{active.participantName}</strong><span>@{active.participantUsername}</span></div></header>}<div className="message-stream">{messages.map(m=><div key={m.id} className={`bubble ${m.senderId===user?.uid||m.senderId==='demo-noah'?'mine':''}`}><p>{m.body}</p><small>{relativeTime(m.createdAt)}</small></div>)}</div>{status&&<div className="form-status error">{status}</div>}<form className="message-form" onSubmit={submit}><input value={body} onChange={e=>setBody(e.target.value)} placeholder="Mensagem…" maxLength={2000}/><button disabled={sending||!body.trim()}>{sending?<Loader2 size={18} className="spin"/>:<Send size={18}/>}</button></form></section></div>
}
