import { Bookmark, Flag, Heart, Link2, MessageCircle, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toggleThreadBookmark } from '../api/bookmarks'
import { toggleThreadLike } from '../api/likes'
import type { ThreadPost } from '../lib/types'
import { relativeTime } from '../lib/time'
import Avatar from './Avatar'
import ReportDialog from './ReportDialog'

export default function ThreadCard({ post }: { post: ThreadPost }) {
  const navigate = useNavigate()
  const [liked, setLiked] = useState(Boolean(post.liked))
  const [saved, setSaved] = useState(Boolean(post.saved))
  const [reportOpen, setReportOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [status, setStatus] = useState('')
  const likeCount = post.likes + (liked && !post.liked ? 1 : 0) - (!liked && post.liked ? 1 : 0)

  const doLike = async () => {
    const previous = liked; setLiked(!previous)
    try { setLiked(await toggleThreadLike(post.id, previous)) } catch(error) { setLiked(previous); setStatus(error instanceof Error ? error.message : 'Falha ao curtir.') }
  }
  const doSave = async () => {
    const previous = saved; setSaved(!previous)
    try { setSaved(await toggleThreadBookmark(post.id, previous)) } catch(error) { setSaved(previous); setStatus(error instanceof Error ? error.message : 'Falha ao salvar.') }
  }
  const share = async () => {
    const url = `${location.origin}${location.pathname}#/post/${post.id}`
    if (navigator.share) await navigator.share({ title:`Thread de ${post.displayName}`, text:post.body, url }).catch(()=>undefined)
    else await navigator.clipboard.writeText(url).then(()=>setStatus('Link copiado.')).catch(()=>undefined)
  }

  return (
    <article className="thread-card">
      <button className="avatar-button" onClick={()=>navigate(`/u/${post.username}`)}><Avatar name={post.displayName} src={post.avatarUrl}/></button>
      <div className="thread-main">
        <header className="post-head">
          <button className="identity-link" onClick={()=>navigate(`/u/${post.username}`)}><strong>{post.displayName}</strong><span>@{post.username} · {relativeTime(post.createdAt)}</span></button>
          <div className="menu-wrap"><button className="icon-btn quiet" aria-label="Mais opções" onClick={()=>setMenuOpen(v=>!v)}><MoreHorizontal size={19}/></button>{menuOpen && <div className="mini-menu"><button onClick={()=>{setReportOpen(true);setMenuOpen(false)}}><Flag size={15}/> Denunciar</button></div>}</div>
        </header>
        <button className="thread-open" onClick={()=>navigate(`/post/${post.id}`)}><p className="thread-body">{post.body}</p>{post.imageUrl && <img className="thread-image" src={post.imageUrl} alt="" loading="lazy"/>}</button>
        <footer className="post-actions">
          <button className={liked?'liked':''} onClick={()=>void doLike()}><Heart size={19} fill={liked?'currentColor':'none'}/><span>{likeCount}</span></button>
          <button onClick={()=>navigate(`/post/${post.id}`)}><MessageCircle size={19}/><span>{post.replies}</span></button>
          <button onClick={()=>void share()} title="Copiar link"><Link2 size={18}/></button>
          <button className={`push-right ${saved?'saved':''}`} onClick={()=>void doSave()}><Bookmark size={18} fill={saved?'currentColor':'none'}/></button>
        </footer>
        {status && <small className="inline-status">{status}</small>}
      </div>
      <ReportDialog open={reportOpen} onClose={()=>setReportOpen(false)} targetType="thread" targetId={post.id}/>
    </article>
  )
}
