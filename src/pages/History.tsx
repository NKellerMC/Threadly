import { History as HistoryIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import VideoGrid from '../components/VideoGrid'
import { getWatchHistory } from '../api/reels'
import type { VideoPost } from '../lib/types'
export default function History(){const[videos,setVideos]=useState<VideoPost[]>([]);useEffect(()=>{void getWatchHistory().then(setVideos)},[]);return <div className="page"><header className="page-header"><div><span className="eyebrow">Sem amnésia algorítmica</span><h1>Histórico</h1></div></header>{videos.length?<VideoGrid videos={videos}/>:<EmptyState icon={<HistoryIcon/>} title="Histórico vazio."/>}</div>}
