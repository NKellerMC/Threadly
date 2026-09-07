import { Loader2, MessageCircleMore, Send } from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import EmptyState from '../components/EmptyState'
import { getConversations, getMessages, markConversationRead, sendMessage, subscribeToInbox, subscribeToMessages } from '../api/messages'
import { useAuth } from '../context/AuthContext'
import type { ChatMessage, ConversationSummary } from '../lib/types'
import { relativeTime } from '../lib/time'

export default function Messages() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingChat, setLoadingChat] = useState(false)
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState('')
  const endRef = useRef<HTMLDivElement | null>(null)

  const activeId = params.get('chat') ?? conversations[0]?.id ?? ''
  const active = useMemo(() => conversations.find(c => c.id === activeId), [conversations, activeId])

  const loadConversations = useCallback(async () => {
    const list = await getConversations()
    setConversations(list)
    const requested = params.get('chat')
    if (!requested && list[0]) setParams({ chat: list[0].id }, { replace: true })
    if (requested && !list.some(item => item.id === requested) && list[0]) setParams({ chat: list[0].id }, { replace: true })
  }, [params, setParams])

  useEffect(() => {
    let alive = true
    void loadConversations()
      .catch(error => alive && setStatus(error instanceof Error ? error.message : 'Falha ao carregar conversas.'))
      .finally(() => alive && setLoading(false))
    const unsubscribe = subscribeToInbox(() => {
      void loadConversations().catch(() => undefined)
    })
    return () => { alive = false; unsubscribe() }
  }, [loadConversations])

  useEffect(() => {
    if (!activeId) {
      setMessages([])
      return
    }

    let alive = true
    setLoadingChat(true)
    setStatus('')
    void getMessages(activeId)
      .then(async list => {
        if (!alive) return
        setMessages(list)
        await markConversationRead(activeId)
        if (alive) setConversations(current => current.map(c => c.id === activeId ? { ...c, unread: 0 } : c))
      })
      .catch(error => alive && setStatus(error instanceof Error ? error.message : 'Falha ao carregar mensagens.'))
      .finally(() => alive && setLoadingChat(false))

    const unsubscribe = subscribeToMessages(activeId, message => {
      setMessages(current => current.some(item => item.id === message.id) ? current : [...current, message])
      if (message.senderId !== user?.uid) {
        void markConversationRead(activeId).then(() => setConversations(current => current.map(c => c.id === activeId ? { ...c, unread: 0 } : c))).catch(() => undefined)
      }
      void loadConversations().catch(() => undefined)
    }, setStatus)

    return () => { alive = false; unsubscribe() }
  }, [activeId, loadConversations, user?.uid])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, activeId])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!activeId || !body.trim()) return
    const text = body
    setSending(true)
    setStatus('')
    try {
      const sent = await sendMessage(activeId, text)
      setMessages(current => current.some(item => item.id === sent.id) ? current : [...current, sent])
      setBody('')
      await loadConversations()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Não foi possível enviar a mensagem.')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="page"><div className="center-status"><Loader2 className="spin"/> Carregando suas conversas…</div></div>

  if (!conversations.length) return <div className="page">
    <header className="page-header"><div><span className="eyebrow">Direto</span><h1>Mensagens</h1></div></header>
    {status && <div className="form-status error">{status}</div>}
    <EmptyState icon={<MessageCircleMore/>} title="Nenhuma conversa ainda.">Abra o perfil de alguém e toque em Mensagem para começar.</EmptyState>
  </div>

  return <div className="messages-layout">
    <aside className="conversation-list">
      <div className="conversation-title"><span className="eyebrow">Direto</span><h1>Mensagens</h1></div>
      {conversations.map(conversation => <button key={conversation.id} className={conversation.id === activeId ? 'active' : ''} onClick={() => setParams({ chat: conversation.id })}>
        <Avatar name={conversation.participantName} src={conversation.participantAvatarUrl}/>
        <div>
          <strong>{conversation.participantName}</strong>
          <span>{conversation.lastMessage || 'Conversa iniciada'}</span>
          <small>{relativeTime(conversation.lastMessageAt)}</small>
        </div>
        {conversation.unread > 0 && <b>{conversation.unread > 99 ? '99+' : conversation.unread}</b>}
      </button>)}
    </aside>

    <section className="chat-pane">
      {active && <header className="chat-head">
        <Avatar name={active.participantName} src={active.participantAvatarUrl}/>
        <div><Link to={`/u/${encodeURIComponent(active.participantUsername)}`}><strong>{active.participantName}</strong></Link><span>@{active.participantUsername}</span></div>
      </header>}

      <div className="message-stream">
        {loadingChat ? <div className="chat-loading"><Loader2 className="spin" size={18}/> Carregando mensagens…</div> : messages.length === 0 ? <div className="chat-empty"><MessageCircleMore size={28}/><strong>Comece a conversa.</strong><span>As mensagens enviadas aqui ficam salvas na sua conversa.</span></div> : messages.map(message => <div key={message.id} className={`bubble ${message.senderId === user?.uid ? 'mine' : ''}`}>
          <p>{message.body}</p>
          <small>{relativeTime(message.createdAt)}</small>
        </div>)}
        <div ref={endRef}/>
      </div>

      {status && <div className="chat-status form-status error">{status}</div>}
      <form className="message-form" onSubmit={submit}>
        <input value={body} onChange={e => setBody(e.target.value)} placeholder="Mensagem…" maxLength={2000} autoComplete="off"/>
        <button aria-label="Enviar mensagem" disabled={sending || !body.trim()}>{sending ? <Loader2 size={18} className="spin"/> : <Send size={18}/>}</button>
      </form>
    </section>
  </div>
}
