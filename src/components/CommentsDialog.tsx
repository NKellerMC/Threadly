import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Loader2, Send, X } from 'lucide-react'
import { addVideoComment, getVideoComments } from '../api/comments'
import type { Comment } from '../lib/types'
import { relativeTime } from '../lib/time'
import Avatar from './Avatar'

export default function CommentsDialog({ videoId, open, onClose }: { videoId: string; open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
    if (open) {
      setLoading(true)
      void getVideoComments(videoId).then(setComments).catch(e => setStatus(e instanceof Error ? e.message : 'Falha ao carregar comentários.')).finally(() => setLoading(false))
    }
  }, [open, videoId])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!body.trim()) return
    setSending(true); setStatus('')
    try {
      const comment = await addVideoComment(videoId, body)
      setComments(list => [...list, comment])
      setBody('')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Falha ao comentar.')
    } finally { setSending(false) }
  }

  return (
    <dialog ref={ref} className="sheet-dialog comments-dialog" onClose={onClose}>
      <div className="sheet-head"><div><span className="eyebrow">Conversa</span><h2>Comentários</h2></div><button className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={20}/></button></div>
      <div className="comments-list">
        {loading && <div className="center-status"><Loader2 className="spin" size={22}/> carregando</div>}
        {!loading && !comments.length && <div className="empty-mini">Ainda não há comentários. Seja a primeira pessoa a dizer algo útil.</div>}
        {comments.map(comment => <article key={comment.id} className="comment-row"><Avatar name={comment.displayName} src={comment.avatarUrl} size="sm"/><div><p><strong>{comment.displayName}</strong> <span>@{comment.username} · {relativeTime(comment.createdAt)}</span></p><div>{comment.body}</div></div></article>)}
      </div>
      {status && <div className="form-status error">{status}</div>}
      <form className="comment-form" onSubmit={submit}><input value={body} onChange={e=>setBody(e.target.value)} maxLength={500} placeholder="Adicione um comentário…"/><button disabled={sending || !body.trim()} aria-label="Enviar">{sending ? <Loader2 className="spin" size={18}/> : <Send size={18}/>}</button></form>
    </dialog>
  )
}
