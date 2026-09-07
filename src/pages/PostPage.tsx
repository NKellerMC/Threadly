import { ArrowLeft, Loader2, Send } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { addThreadReply, getThread, getThreadReplies } from '../api/threads'
import Avatar from '../components/Avatar'
import EmptyState from '../components/EmptyState'
import ThreadCard from '../components/ThreadCard'
import { useAuth } from '../context/AuthContext'
import { relativeTime } from '../lib/time'
import type { ThreadPost, ThreadReply } from '../lib/types'

export default function PostPage(){
  const{id=''}=useParams();const navigate=useNavigate();const{user}=useAuth();const[post,setPost]=useState<ThreadPost|null>(null);const[replies,setReplies]=useState<ThreadReply[]>([]);const[body,setBody]=useState('');const[loading,setLoading]=useState(true);const[sending,setSending]=useState(false);const[status,setStatus]=useState('')
  useEffect(()=>{setLoading(true);void Promise.all([getThread(id),getThreadReplies(id)]).then(([p,r])=>{setPost(p);setReplies(r)}).catch(e=>setStatus(e instanceof Error?e.message:'Falha ao carregar conversa.')).finally(()=>setLoading(false))},[id])
  const submit=async(e:FormEvent)=>{e.preventDefault();if(!user){setStatus('Entre na sua conta para responder.');return}if(!body.trim())return;setSending(true);setStatus('');try{const reply=await addThreadReply(id,body);setReplies(list=>[...list,reply]);setBody('');setPost(p=>p?{...p,replies:p.replies+1}:p)}catch(error){setStatus(error instanceof Error?error.message:'Falha ao responder.')}finally{setSending(false)}}
  return <div className="page narrow-page"><header className="page-header compact-header"><button className="icon-btn bordered" onClick={()=>navigate(-1)}><ArrowLeft size={19}/></button><div><span className="eyebrow">Thread</span><h1>Conversa</h1></div></header>{loading?<div className="center-status"><Loader2 className="spin"/> carregando</div>:post?<><div className="feed-list"><ThreadCard post={post}/></div><section className="replies-panel"><h3>Respostas <span>{post.replies}</span></h3><form className="reply-form" onSubmit={submit}><textarea value={body} onChange={e=>setBody(e.target.value)} maxLength={500} placeholder={user?'Escreva uma resposta…':'Entre para responder'} disabled={!user}/><div><small>{body.length}/500</small><button className="btn primary" disabled={!user||sending||!body.trim()}>{sending?<Loader2 size={16} className="spin"/>:<Send size={16}/>} Responder</button></div></form>{status&&<div className="form-status error">{status}</div>}<div className="reply-list">{replies.map(reply=><article className="reply-card" key={reply.id}><Avatar name={reply.displayName} src={reply.avatarUrl}/><div><header><strong>{reply.displayName}</strong><span>@{reply.username} · {relativeTime(reply.createdAt)}</span></header><p>{reply.body}</p></div></article>)}{!replies.length&&<EmptyState title="Nenhuma resposta ainda.">Seja a primeira pessoa a continuar a conversa.</EmptyState>}</div></section></>:<EmptyState title="Thread não encontrada."/>}</div>
}
