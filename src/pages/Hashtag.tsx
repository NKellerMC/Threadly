import { Hash, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import ThreadCard from '../components/ThreadCard'
import VideoGrid from '../components/VideoGrid'
import { searchEverything } from '../api/search'
import type { SearchResults } from '../lib/types'
const empty:SearchResults={profiles:[],threads:[],videos:[]}
export default function Hashtag(){const{tag=''}=useParams();const[data,setData]=useState(empty);const[loading,setLoading]=useState(true);useEffect(()=>{setLoading(true);void searchEverything(`#${tag}`).then(setData).finally(()=>setLoading(false))},[tag]);return <div className="page"><header className="page-header"><div><span className="eyebrow">Assunto</span><h1>#{tag}</h1></div></header>{loading?<div className="center-status"><Loader2 className="spin"/></div>:!data.threads.length&&!data.videos.length?<EmptyState icon={<Hash/>} title="Nada com essa hashtag ainda."/>:<><div className="section-title"><h2>Threads</h2></div><div className="feed-list">{data.threads.map(t=><ThreadCard key={t.id} post={t}/>)}</div><div className="section-title spaced"><h2>Clips</h2></div><VideoGrid videos={data.videos}/></>}</div>}
