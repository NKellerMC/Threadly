import { Heart } from 'lucide-react'
import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import VideoGrid from '../components/VideoGrid'
import { getLikedVideos } from '../api/reels'
import type { VideoPost } from '../lib/types'
export default function LikedVideos(){const[videos,setVideos]=useState<VideoPost[]>([]);useEffect(()=>{void getLikedVideos().then(setVideos)},[]);return <div className="page"><header className="page-header"><div><span className="eyebrow">Seu gosto, infelizmente público só para você</span><h1>Curtidos</h1></div></header>{videos.length?<VideoGrid videos={videos}/>:<EmptyState icon={<Heart/>} title="Você ainda não curtiu clips."/>}</div>}
