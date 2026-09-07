import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import VideoCard from '../components/VideoCard'
import { getVideos } from '../api/reels'
import type { VideoPost } from '../lib/types'

export default function Clips(){const [videos,setVideos]=useState<VideoPost[]>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState('');useEffect(()=>{void getVideos().then(setVideos).catch(e=>setError(e instanceof Error?e.message:'Falha ao carregar clips.')).finally(()=>setLoading(false))},[]);if(loading)return <div className="clips-page"><div className="center-status"><Loader2 className="spin"/> carregando clips</div></div>;if(error)return <div className="page"><div className="form-status error">{error}</div></div>;return <div className="clips-page"><div className="clips-rail">{videos.length?videos.map(v=><VideoCard key={v.id} video={v}/>):<EmptyState title="Nenhum clip ainda.">Publique o primeiro.</EmptyState>}</div></div>}
