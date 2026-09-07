import { ChevronDown, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import Avatar from '../components/Avatar'
import EmptyState from '../components/EmptyState'
import ThreadCard from '../components/ThreadCard'
import { getThreads } from '../api/threads'
import { useAuth } from '../context/AuthContext'
import type { ThreadPost } from '../lib/types'

export default function Home({ followingOnly = false }: { followingOnly?: boolean }) {
  const [posts,setPosts]=useState<ThreadPost[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState('')
  const {user}=useAuth()
  const load=async()=>{setLoading(true);setError('');try{setPosts(await getThreads({followingOnly}))}catch(e){setError(e instanceof Error?e.message:'Falha ao carregar feed.')}finally{setLoading(false)}}
  useEffect(()=>{void load();const refresh=()=>void load();window.addEventListener('threadly:refresh',refresh);return()=>window.removeEventListener('threadly:refresh',refresh)},[followingOnly])
  return <div className="page feed-page"><header className="page-header feed-header"><div><span className="eyebrow">{followingOnly?'Quem você escolheu':'Seu feed'}</span><h1>{followingOnly?'Seguindo':'Para você'} <ChevronDown size={20}/></h1></div><div className="feed-mode"><Sparkles size={16}/><span>{followingOnly?'Ordem recente':'Descoberta equilibrada'}</span></div></header>
    <section className="quick-composer"><Avatar name={user?.displayName||'Você'} src={user?.photoURL}/><button onClick={()=>window.dispatchEvent(new Event('threadly:open-create'))}>Compartilhe uma ideia, não uma performance.</button></section>
    {error&&<div className="form-status error">{error}</div>}<section className="feed-list">{loading?Array.from({length:4}).map((_,i)=><div className="skeleton thread-skeleton" key={i}/>):posts.length?posts.map(post=><ThreadCard key={post.id} post={post}/>):<EmptyState title={followingOnly?'Seu feed de seguindo está vazio.':'Nada por aqui ainda.'}>Siga pessoas ou publique algo. Um feed vazio é pelo menos honesto.</EmptyState>}</section>
  </div>
}
