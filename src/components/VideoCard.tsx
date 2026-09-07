import { Bookmark, Flag, Heart, MessageCircle, MoreHorizontal, Share2, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toggleVideoBookmark } from '../api/bookmarks'
import { toggleFollow } from '../api/follows'
import { toggleVideoLike } from '../api/likes'
import { recordView } from '../api/reels'
import type { VideoPost } from '../lib/types'
import { formatCompact } from '../lib/time'
import Avatar from './Avatar'
import CommentsDialog from './CommentsDialog'
import ReportDialog from './ReportDialog'

export default function VideoCard({ video }: { video: VideoPost }) {
  const navigate = useNavigate()
  const ref = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(true)
  const [liked, setLiked] = useState(Boolean(video.liked))
  const [saved, setSaved] = useState(Boolean(video.saved))
  const [following, setFollowing] = useState(Boolean(video.followingAuthor))
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio > .7) {
        void el.play().catch(() => undefined)
        void recordView(video.id)
      } else el.pause()
    }, { threshold: [.1,.7,.95] })
    observer.observe(el)
    return () => observer.disconnect()
  }, [video.id])

  const doLike = async () => { const p=liked; setLiked(!p); try{setLiked(await toggleVideoLike(video.id,p))}catch(e){setLiked(p);setStatus(e instanceof Error?e.message:'Falha ao curtir.')} }
  const doSave = async () => { const p=saved; setSaved(!p); try{setSaved(await toggleVideoBookmark(video.id,p))}catch(e){setSaved(p);setStatus(e instanceof Error?e.message:'Falha ao salvar.')} }
  const doFollow = async () => { const p=following; setFollowing(!p); try{setFollowing(await toggleFollow(video.userId,p))}catch(e){setFollowing(p);setStatus(e instanceof Error?e.message:'Falha ao seguir.')} }
  const share = async () => {
    const url=`${location.origin}${location.pathname}#/watch/${video.id}`
    if(navigator.share) await navigator.share({title:video.title,text:video.description,url}).catch(()=>undefined)
    else await navigator.clipboard.writeText(url).then(()=>setStatus('Link copiado.')).catch(()=>undefined)
  }

  return (
    <article className="video-card">
      <video ref={ref} src={video.videoUrl} muted={muted} loop playsInline preload="metadata" poster={video.thumbnailUrl??undefined} onClick={()=>ref.current?.paused?void ref.current.play():ref.current?.pause()}/>
      <div className="video-scrim"/>
      <button className="video-sound" onClick={()=>setMuted(v=>!v)}>{muted?<VolumeX size={19}/>:<Volume2 size={19}/>}</button>
      <div className="video-meta">
        <div className="video-author"><button className="avatar-button" onClick={()=>navigate(`/u/${video.username}`)}><Avatar name={video.displayName} src={video.avatarUrl} size="sm"/></button><button className="author-copy" onClick={()=>navigate(`/u/${video.username}`)}><strong>{video.displayName}</strong><span>@{video.username}</span></button><button className={following?'following':''} onClick={()=>void doFollow()}>{following?'Seguindo':'Seguir'}</button></div>
        <button className="video-title-link" onClick={()=>navigate(`/watch/${video.id}`)}><h2>{video.title}</h2><p>{video.description}</p></button>
        {status && <small className="video-status">{status}</small>}
      </div>
      <div className="video-actions">
        <button className={liked?'liked':''} onClick={()=>void doLike()}><span><Heart size={23} fill={liked?'currentColor':'none'}/></span><small>{formatCompact(video.likes+(liked&&!video.liked?1:0))}</small></button>
        <button onClick={()=>setCommentsOpen(true)}><span><MessageCircle size={23}/></span><small>{formatCompact(video.comments)}</small></button>
        <button onClick={()=>void share()}><span><Share2 size={22}/></span><small>Enviar</small></button>
        <button className={saved?'saved':''} onClick={()=>void doSave()}><span><Bookmark size={21} fill={saved?'currentColor':'none'}/></span><small>Salvar</small></button>
        <div className="menu-wrap"><button onClick={()=>setMenuOpen(v=>!v)}><span><MoreHorizontal size={22}/></span></button>{menuOpen&&<div className="video-mini-menu"><button onClick={()=>{setReportOpen(true);setMenuOpen(false)}}><Flag size={15}/> Denunciar</button></div>}</div>
      </div>
      <CommentsDialog videoId={video.id} open={commentsOpen} onClose={()=>setCommentsOpen(false)}/>
      <ReportDialog open={reportOpen} onClose={()=>setReportOpen(false)} targetType="video" targetId={video.id}/>
    </article>
  )
}
