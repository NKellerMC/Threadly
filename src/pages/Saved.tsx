import { Bookmark } from 'lucide-react'
import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import ThreadCard from '../components/ThreadCard'
import VideoGrid from '../components/VideoGrid'
import { getSaved } from '../api/bookmarks'
import type { ThreadPost, VideoPost } from '../lib/types'

export default function Saved(){const[videos,setVideos]=useState<VideoPost[]>([]);const[threads,setThreads]=useState<ThreadPost[]>([]);const[tab,setTab]=useState<'clips'|'threads'>('clips');useEffect(()=>{void getSaved().then(r=>{setVideos(r.videos);setThreads(r.threads)})},[]);return <div className="page"><header className="page-header"><div><span className="eyebrow">Para depois</span><h1>Salvos</h1></div></header><div className="profile-tabs"><button className={tab==='clips'?'active':''} onClick={()=>setTab('clips')}>Clips</button><button className={tab==='threads'?'active':''} onClick={()=>setTab('threads')}>Threads</button></div>{tab==='clips'?(videos.length?<VideoGrid videos={videos}/>:<EmptyState icon={<Bookmark/>} title="Nenhum clip salvo."/>):(threads.length?<div className="feed-list">{threads.map(t=><ThreadCard key={t.id} post={t}/>)}</div>:<EmptyState icon={<Bookmark/>} title="Nenhuma thread salva."/>)}</div>}
