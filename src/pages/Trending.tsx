import { TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import VideoGrid from '../components/VideoGrid'
import { getTrendingVideos } from '../api/reels'
import type { VideoPost } from '../lib/types'
export default function Trending(){const[videos,setVideos]=useState<VideoPost[]>([]);useEffect(()=>{void getTrendingVideos().then(setVideos)},[]);return <div className="page"><header className="page-header"><div><span className="eyebrow">Últimos 7 dias</span><h1>Em alta</h1></div></header>{videos.length?<VideoGrid videos={videos}/>:<EmptyState icon={<TrendingUp/>} title="Nada está explodindo agora."/>}</div>}
