import { Loader2, Search as SearchIcon, UserRound } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import EmptyState from '../components/EmptyState'
import ThreadCard from '../components/ThreadCard'
import VideoGrid from '../components/VideoGrid'
import { searchEverything } from '../api/search'
import type { SearchResults } from '../lib/types'

const empty:SearchResults={profiles:[],threads:[],videos:[]}
export default function SearchPage(){
  const [params]=useSearchParams(); const navigate=useNavigate(); const initial=params.get('q')??''; const [query,setQuery]=useState(initial); const [results,setResults]=useState<SearchResults>(empty); const [loading,setLoading]=useState(false); const [error,setError]=useState('')
  const run=async(q:string)=>{if(!q.trim()){setResults(empty);return}setLoading(true);setError('');try{setResults(await searchEverything(q))}catch(e){setError(e instanceof Error?e.message:'Falha na busca.')}finally{setLoading(false)}}
  useEffect(()=>{setQuery(initial);void run(initial)},[initial])
  const submit=(e:FormEvent)=>{e.preventDefault();navigate(`/search?q=${encodeURIComponent(query.trim())}`)}
  const has=results.profiles.length+results.threads.length+results.videos.length>0
  return <div className="page"><header className="page-header"><div><span className="eyebrow">Encontre o que presta</span><h1>Busca</h1></div></header><form className="searchbox" onSubmit={submit}><SearchIcon size={20}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquise pessoas, threads ou clips"/>{loading&&<Loader2 size={18} className="spin"/>}</form>{error&&<div className="form-status error">{error}</div>}
    {!loading&&initial&&!has&&<EmptyState icon={<SearchIcon/>} title="Nada encontrado.">Tente outra palavra; o algoritmo ainda não aprendeu telepatia.</EmptyState>}
    {results.profiles.length>0&&<section className="result-section"><div className="section-title"><UserRound size={18}/><h2>Pessoas</h2></div><div className="people-results">{results.profiles.map(p=><button key={p.id} onClick={()=>navigate(`/u/${p.username}`)}><Avatar name={p.displayName} src={p.avatarUrl}/><div><strong>{p.displayName}</strong><span>@{p.username}</span><p>{p.bio}</p></div></button>)}</div></section>}
    {results.threads.length>0&&<section className="result-section"><div className="section-title"><h2>Threads</h2></div><div className="feed-list">{results.threads.map(t=><ThreadCard key={t.id} post={t}/>)}</div></section>}
    {results.videos.length>0&&<section className="result-section"><div className="section-title"><h2>Clips</h2></div><VideoGrid videos={results.videos}/></section>}
  </div>
}
