import { Clapperboard, ImagePlus, Loader2, MessageSquareText, Upload, X } from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { createThread } from '../api/threads'
import { publishVideo } from '../api/upload'
import { useAuth } from '../context/AuthContext'

type Mode='thread'|'clip'

export default function CreateDialog({open,onClose}:{open:boolean;onClose:()=>void}){
  const dialogRef=useRef<HTMLDialogElement>(null)
  const [mode,setMode]=useState<Mode>('thread'); const [body,setBody]=useState(''); const [threadImage,setThreadImage]=useState<File|null>(null); const [title,setTitle]=useState(''); const [description,setDescription]=useState(''); const [file,setFile]=useState<File|null>(null); const [busy,setBusy]=useState(false); const [status,setStatus]=useState('')
  const {user,supabaseRoleReady}=useAuth()
  useEffect(()=>{const d=dialogRef.current;if(!d)return;if(open&&!d.open)d.showModal();if(!open&&d.open)d.close()},[open])
  const reset=()=>{setBody('');setThreadImage(null);setTitle('');setDescription('');setFile(null);setStatus('')}
  const submit=async(event:FormEvent)=>{event.preventDefault();if(!user){setStatus('Sua sessão expirou. Entre novamente para publicar.');return}if(!supabaseRoleReady){setStatus('Sua sessão ainda não está pronta. Tente novamente em instantes.');return}
    setBusy(true);setStatus(mode==='clip'?'Preparando upload…':'Publicando…')
    try{if(mode==='thread'){if(!body.trim())throw new Error('Escreva alguma coisa primeiro.');await createThread(user.uid,body.trim(),threadImage)}else{if(!file)throw new Error('Escolha um vídeo.');if(!title.trim())throw new Error('Dê um título ao clip.');await publishVideo({userId:user.uid,file,title:title.trim(),description:description.trim(),onProgress:setStatus})}reset();onClose();window.dispatchEvent(new Event('threadly:refresh'))}catch(error){setStatus(error instanceof Error?error.message:'Falha ao publicar.')}finally{setBusy(false)}}
  return <dialog ref={dialogRef} className="create-dialog" onClose={onClose}><form onSubmit={submit}><div className="dialog-head"><div><small>Nova publicação</small><h2>Coloque algo no mundo.</h2></div><button type="button" className="icon-btn" onClick={onClose}><X size={21}/></button></div><div className="mode-switch"><button type="button" className={mode==='thread'?'active':''} onClick={()=>setMode('thread')}><MessageSquareText size={18}/> Thread</button><button type="button" className={mode==='clip'?'active':''} onClick={()=>setMode('clip')}><Clapperboard size={18}/> Clip</button></div>
    {mode==='thread'?<div className="composer"><textarea value={body} onChange={e=>setBody(e.target.value)} maxLength={800} placeholder="No que você está pensando?" autoFocus/><div className="composer-foot"><label className="inline-upload"><ImagePlus size={17}/><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>setThreadImage(e.target.files?.[0]??null)}/><span>{threadImage?threadImage.name:'Adicionar imagem'}</span></label><b>{body.length}/800</b></div>{threadImage&&<button type="button" className="remove-media" onClick={()=>setThreadImage(null)}>Remover imagem</button>}</div>:<div className="clip-form"><label className={`dropzone ${file?'has-file':''}`}><input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={e=>setFile(e.target.files?.[0]??null)}/><Upload size={28}/><strong>{file?file.name:'Solte ou escolha um vídeo'}</strong><span>MP4, WebM ou MOV · até 200 MB.</span></label><input value={title} onChange={e=>setTitle(e.target.value)} maxLength={120} placeholder="Título"/><textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={500} placeholder="Descrição (opcional)"/></div>}
    {status&&<div className={`form-status ${status.toLowerCase().includes('falha')||status.toLowerCase().includes('expirou')?'error':''}`}>{status}</div>}<div className="dialog-actions"><button type="button" className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn primary" disabled={busy}>{busy&&<Loader2 className="spin" size={17}/>} Publicar</button></div></form></dialog>
}
