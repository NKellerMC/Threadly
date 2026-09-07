import { ChevronLeft, ChevronRight, Plus, Send, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getNotes, getStories, reactStory, saveNote, viewStory } from '../api/social'
import { useAuth } from '../context/AuthContext'
import type { NoteItem, Story, StoryGroup } from '../lib/types'
import Avatar from './Avatar'

export default function StoriesRail(){
  const {user}=useAuth();const[groups,setGroups]=useState<StoryGroup[]>([]);const[notes,setNotes]=useState<NoteItem[]>([]);const[noteOpen,setNoteOpen]=useState(false);const[note,setNote]=useState('');const[noteAudience,setNoteAudience]=useState<'followers'|'close_friends'>('followers');const[active,setActive]=useState<{group:number;story:number}|null>(null);const[status,setStatus]=useState('');const dialogRef=useRef<HTMLDialogElement>(null)
  const load=async()=>{try{const[g,n]=await Promise.all([getStories(),getNotes()]);setGroups(g);setNotes(n)}catch(e){setStatus(e instanceof Error?e.message:'Falha ao carregar stories.')}}
  useEffect(()=>{void load();const refresh=()=>void load();window.addEventListener('threadly:refresh',refresh);return()=>window.removeEventListener('threadly:refresh',refresh)},[])
  useEffect(()=>{const d=dialogRef.current;if(active&&!d?.open)d?.showModal();if(!active&&d?.open)d.close()},[active])
  const activeStory:Story|null=useMemo(()=>active?groups[active.group]?.stories[active.story]??null:null,[active,groups])
  useEffect(()=>{if(activeStory&&!activeStory.viewed){void viewStory(activeStory.id).then(()=>setGroups(current=>current.map(group=>({...group,stories:group.stories.map(s=>s.id===activeStory.id?{...s,viewed:true}:s),hasUnseen:group.stories.some(s=>s.id!==activeStory.id&&!s.viewed)}))).catch(()=>undefined)}},[activeStory])
  const next=(delta:number)=>{if(!active)return;const group=groups[active.group];const storyIndex=active.story+delta;if(storyIndex>=0&&storyIndex<group.stories.length){setActive({...active,story:storyIndex});return}const groupIndex=active.group+(delta>0?1:-1);if(groupIndex<0||groupIndex>=groups.length){setActive(null);return}const nextGroup=groups[groupIndex];setActive({group:groupIndex,story:delta>0?0:nextGroup.stories.length-1})}
  const submitNote=async()=>{try{await saveNote(note,noteAudience);setNote('');setNoteOpen(false);await load()}catch(e){setStatus(e instanceof Error?e.message:'Falha ao publicar nota.')}}
  const ownNote=notes.find(n=>n.userId===user?.uid)
  return <>
    <section className="social-rail" aria-label="Stories e notas">
      <button className="story-entry own-story" onClick={()=>window.dispatchEvent(new Event('threadly:open-create'))}><span className="story-ring"><Avatar name={user?.displayName||'Você'} src={user?.photoURL}/><i><Plus size={13}/></i></span><small>Seu story</small></button>
      {groups.filter(g=>g.userId!==user?.uid).map((group,index)=>{const actualIndex=groups.indexOf(group);return <button key={group.userId} className="story-entry" onClick={()=>setActive({group:actualIndex,story:0})}><span className={`story-ring ${group.hasUnseen?'unseen':''}`}><Avatar name={group.displayName} src={group.avatarUrl}/></span><small>{group.username}</small></button>})}
      <button className="note-entry" onClick={()=>{setNote(ownNote?.body??'');setNoteOpen(v=>!v)}}><span className="note-bubble">{ownNote?.body||'Deixe uma nota'}</span><Avatar name={user?.displayName||'Você'} src={user?.photoURL}/><small>Sua nota</small></button>
      {notes.filter(n=>n.userId!==user?.uid).slice(0,8).map(n=><button key={n.id} className="note-entry" onClick={()=>location.hash=`#/u/${encodeURIComponent(n.username)}`}><span className="note-bubble">{n.body}</span><Avatar name={n.displayName} src={n.avatarUrl}/><small>{n.username}</small></button>)}
    </section>
    {noteOpen&&<div className="note-composer"><input value={note} maxLength={80} onChange={e=>setNote(e.target.value)} placeholder="Compartilhe uma nota…" autoFocus/><select value={noteAudience} onChange={e=>setNoteAudience(e.target.value as typeof noteAudience)}><option value="followers">Seguidores</option><option value="close_friends">Amigos próximos</option></select><button onClick={()=>void submitNote()} disabled={!note.trim()}><Send size={16}/></button></div>}
    {status&&<small className="inline-status rail-status">{status}</small>}
    <dialog ref={dialogRef} className="story-viewer" onClose={()=>setActive(null)}>{activeStory&&<div className="story-stage"><div className="story-progress">{groups[active!.group].stories.map((s,i)=><span key={s.id} className={i<=active!.story?'done':''}/>)}</div><header><Avatar name={activeStory.displayName} src={activeStory.avatarUrl}/><div><strong>{activeStory.displayName}</strong><small>@{activeStory.username}</small></div><button className="icon-btn" onClick={()=>setActive(null)}><X/></button></header>{activeStory.mediaType==='video'?<video src={activeStory.mediaUrl} autoPlay playsInline controls/>:<img src={activeStory.mediaUrl} alt="Story"/>}<p>{activeStory.caption}</p><button className="story-prev" onClick={()=>next(-1)}><ChevronLeft/></button><button className="story-next" onClick={()=>next(1)}><ChevronRight/></button><footer><span>Reagir:</span>{['❤️','😂','🔥','👏','😮'].map(emoji=><button key={emoji} onClick={()=>void reactStory(activeStory.id,emoji)}>{emoji}</button>)}</footer></div>}</dialog>
  </>
}
