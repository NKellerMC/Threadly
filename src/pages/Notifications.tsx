import { AtSign, Bell, BellOff, Heart, Loader2, MessageCircle, MessageCircleMore, Repeat2, Sparkles, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import { getNotifications, markAllNotificationsRead } from '../api/notifications'
import type { NotificationItem } from '../lib/types'
import { relativeTime } from '../lib/time'

const icons: Record<NotificationItem['type'], typeof Heart> = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  mention: AtSign,
  system: Bell,
  story: Sparkles,
  follow_request: UserPlus,
  repost: Repeat2,
  message: MessageCircleMore,
  collaboration: Sparkles,
}

export default function Notifications(){
  const [items,setItems]=useState<NotificationItem[]>([]);const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false)
  useEffect(()=>{void getNotifications().then(setItems).finally(()=>setLoading(false))},[])
  const mark=async()=>{setBusy(true);try{await markAllNotificationsRead();setItems(list=>list.map(n=>({...n,read:true})))}finally{setBusy(false)}}
  return <div className="page narrow-page"><header className="page-header"><div><span className="eyebrow">Sem caça-níquel</span><h1>Atividade</h1></div><button className="text-btn" onClick={()=>void mark()} disabled={busy}>{busy?<Loader2 size={16} className="spin"/>:'Marcar como lidas'}</button></header>{loading?<div className="center-status"><Loader2 className="spin"/> carregando</div>:items.length?<div className="activity-list">{items.map(item=>{const Icon=icons[item.type]??Bell;return <article key={item.id} className={item.read?'':'unread'}><span className="activity-icon"><Icon size={19}/></span><div><p><strong>{item.actorDisplayName&&`${item.actorDisplayName} `}</strong>{item.text}</p><small>{relativeTime(item.createdAt)}</small></div>{!item.read&&<span className="unread-dot"/>}</article>})}</div>:<EmptyState icon={<BellOff/>} title="Nenhuma atividade ainda.">Quando algo acontecer, aparece aqui. Sem notificações inventadas para puxar você de volta.</EmptyState>}</div>
}
