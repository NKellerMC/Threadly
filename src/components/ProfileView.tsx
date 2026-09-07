import { Flag, Link as LinkIcon, MessageCircle, Settings2, UserCheck, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getVideos } from '../api/reels'
import { getThreads } from '../api/threads'
import { isFollowing, toggleFollow } from '../api/follows'
import { startConversation } from '../api/messages'
import type { Profile, ThreadPost, VideoPost } from '../lib/types'
import { formatCompact } from '../lib/time'
import Avatar from './Avatar'
import ThreadCard from './ThreadCard'
import VideoGrid from './VideoGrid'
import ReportDialog from './ReportDialog'

export default function ProfileView({ profile, own = false }: { profile: Profile; own?: boolean }) {
  const navigate=useNavigate();const[tab,setTab]=useState<'clips'|'threads'>('clips');const[videos,setVideos]=useState<VideoPost[]>([]);const[threads,setThreads]=useState<ThreadPost[]>([]);const[following,setFollowing]=useState(false);const[reportOpen,setReportOpen]=useState(false);const[status,setStatus]=useState('')
  useEffect(()=>{void Promise.all([getVideos({userId:profile.id}),getThreads({userId:profile.id}),own?Promise.resolve(false):isFollowing(profile.id)]).then(([v,t,f])=>{setVideos(v);setThreads(t);setFollowing(f)}).catch(e=>setStatus(e instanceof Error?e.message:'Falha ao carregar perfil.'))},[profile.id,own])
  const follow=async()=>{const p=following;setFollowing(!p);try{setFollowing(await toggleFollow(profile.id,p))}catch(e){setFollowing(p);setStatus(e instanceof Error?e.message:'Falha ao seguir.')}}
  const message=async()=>{try{const id=await startConversation(profile.id);navigate(`/messages?chat=${encodeURIComponent(id)}`)}catch(e){setStatus(e instanceof Error?e.message:'Falha ao abrir conversa.')}}
  const share=async()=>{const url=location.href;try{if(navigator.share)await navigator.share({title:profile.displayName,url});else{await navigator.clipboard.writeText(url);setStatus('Link do perfil copiado.')}}catch{setStatus('Não foi possível compartilhar agora.')}}
  return <div className="page profile-page"><section className="profile-hero"><div className="profile-identity"><Avatar name={profile.displayName} src={profile.avatarUrl} size="lg"/><div><h1>{profile.displayName}</h1><p>@{profile.username}</p></div></div><div className="profile-buttons">{own?<><button className="btn ghost" onClick={()=>void share()}><UserPlus size={17}/> Compartilhar</button><Link to="/edit-profile" className="btn ghost"><Settings2 size={17}/> Editar</Link></>:<><button className={`btn ${following?'ghost':'primary'}`} onClick={()=>void follow()}>{following?<UserCheck size={17}/>:<UserPlus size={17}/>} {following?'Seguindo':'Seguir'}</button><button className="btn ghost" onClick={()=>void message()}><MessageCircle size={17}/> Mensagem</button><button className="icon-btn bordered" onClick={()=>setReportOpen(true)}><Flag size={17}/></button></>}</div><p className="profile-bio">{profile.bio||'Sem bio ainda.'}</p>{profile.website&&<a className="profile-link" href={profile.website.startsWith('http')?profile.website:`https://${profile.website}`} target="_blank" rel="noreferrer"><LinkIcon size={15}/>{profile.website}</a>}<div className="profile-stats"><div><strong>{videos.length+threads.length}</strong><span>posts</span></div><div><strong>{formatCompact(profile.followers+(following&&!own?1:0))}</strong><span>seguidores</span></div><div><strong>{formatCompact(profile.following)}</strong><span>seguindo</span></div></div>{status&&<small className="inline-status">{status}</small>}</section><div className="profile-tabs"><button className={tab==='clips'?'active':''} onClick={()=>setTab('clips')}>Clips</button><button className={tab==='threads'?'active':''} onClick={()=>setTab('threads')}>Threads</button></div>{tab==='clips'?<VideoGrid videos={videos}/>:<div className="feed-list">{threads.map(t=><ThreadCard key={t.id} post={t}/>)}</div>}<ReportDialog open={reportOpen} onClose={()=>setReportOpen(false)} targetType="profile" targetId={profile.id}/></div>
}
