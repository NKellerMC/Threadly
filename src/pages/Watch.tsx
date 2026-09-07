import { ArrowLeft, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import VideoCard from '../components/VideoCard'
import { getVideo } from '../api/reels'
import type { VideoPost } from '../lib/types'
export default function Watch(){const{id=''}=useParams();const navigate=useNavigate();const[video,setVideo]=useState<VideoPost|null>(null);const[loading,setLoading]=useState(true);useEffect(()=>{setLoading(true);void getVideo(id).then(setVideo).finally(()=>setLoading(false))},[id]);if(loading)return <div className="watch-page"><div className="center-status"><Loader2 className="spin"/> carregando clip</div></div>;if(!video)return <div className="page"><EmptyState title="Clip não encontrado."/></div>;return <div className="watch-page"><button className="back-fab" onClick={()=>navigate(-1)}><ArrowLeft size={20}/></button><div className="single-video"><VideoCard video={video}/></div></div>}
