import { Search, TrendingUp } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import VideoGrid from '../components/VideoGrid'
import { getTrendingVideos } from '../api/reels'
import type { VideoPost } from '../lib/types'

const topics=['cinema','arte digital','música','fotografia','escrita','tecnologia','games','viagem']
export default function Explore(){
  const [query,setQuery]=useState(''); const [videos,setVideos]=useState<VideoPost[]>([]); const navigate=useNavigate()
  useEffect(()=>{void getTrendingVideos(12).then(setVideos).catch(()=>setVideos([]))},[])
  const submit=(e:FormEvent)=>{e.preventDefault();if(query.trim())navigate(`/search?q=${encodeURIComponent(query.trim())}`)}
  return <div className="page explore-page"><header className="page-header"><div><span className="eyebrow">Saia da bolha</span><h1>Explorar</h1></div></header><form className="searchbox" onSubmit={submit}><Search size={20}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pessoas, assuntos, ideias…"/></form>
    <section className="topic-section"><div className="section-title"><TrendingUp size={18}/><h2>Assuntos em movimento</h2></div><div className="topic-cloud">{topics.map(t=><button key={t} onClick={()=>navigate(`/hashtag/${encodeURIComponent(t.replaceAll(' ',''))}`)}><span>#</span>{t}<small>ver posts</small></button>)}</div></section>
    <div className="section-title"><TrendingUp size={18}/><h2>Clips em alta</h2></div><VideoGrid videos={videos}/>
  </div>
}
