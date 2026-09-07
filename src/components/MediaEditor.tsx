import { Check, Crop, Loader2, RotateCcw, RotateCw, SlidersHorizontal, SmilePlus, Type, Undo2, Redo2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_MEDIA_EDIT, editCssFilter, renderEditedMedia, videoDuration } from '../lib/mediaEditor'
import type { MediaEditState } from '../lib/types'

type Props = {
  file: File | null
  onCancel: () => void
  onApply: (file: File, state: MediaEditState) => void
}

const aspects: MediaEditState['aspect'][] = ['original','1:1','4:5','9:16','16:9']

function clone(state: MediaEditState): MediaEditState { return { ...state } }

export default function MediaEditor({ file, onCancel, onApply }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [state, setState] = useState<MediaEditState>(clone(DEFAULT_MEDIA_EDIT))
  const [undo, setUndo] = useState<MediaEditState[]>([])
  const [redo, setRedo] = useState<MediaEditState[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState('')
  const url = useMemo(() => file ? URL.createObjectURL(file) : '', [file])
  const isVideo = Boolean(file?.type.startsWith('video/'))

  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  useEffect(() => {
    const d = dialogRef.current
    if (file && d && !d.open) d.showModal()
    if (!file && d?.open) d.close()
    setState(clone(DEFAULT_MEDIA_EDIT)); setUndo([]); setRedo([]); setError(''); setProgress(0)
    if (file?.type.startsWith('video/')) void videoDuration(file).then(value => { setDuration(value); setState(s => ({ ...s, trimEnd: value })) }).catch(() => undefined)
    else setDuration(0)
  }, [file])

  const change = (patch: Partial<MediaEditState>) => {
    setUndo(items => [...items.slice(-29), clone(state)])
    setRedo([])
    setState(s => ({ ...s, ...patch }))
  }
  const goUndo = () => {
    const previous = undo.at(-1); if (!previous) return
    setRedo(items => [...items, clone(state)]); setUndo(items => items.slice(0,-1)); setState(clone(previous))
  }
  const goRedo = () => {
    const next = redo.at(-1); if (!next) return
    setUndo(items => [...items, clone(state)]); setRedo(items => items.slice(0,-1)); setState(clone(next))
  }
  const rotate = (delta: number) => change({ rotate: (((state.rotate + delta + 360) % 360) as MediaEditState['rotate']) })
  const apply = async () => {
    if (!file) return
    setBusy(true); setError(''); setProgress(0)
    try {
      const edited = await renderEditedMedia(file, state, setProgress)
      onApply(edited, state)
      dialogRef.current?.close()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível renderizar a edição.')
    } finally { setBusy(false) }
  }

  const previewStyle = { filter: editCssFilter(state), transform: `rotate(${state.rotate}deg)` }
  const aspectStyle = state.aspect === 'original' ? undefined : { aspectRatio: state.aspect.replace(':',' / ') }

  return <dialog ref={dialogRef} className="media-editor" onCancel={event => { event.preventDefault(); if (!busy) onCancel() }}>
    <div className="editor-shell">
      <header className="editor-head">
        <button className="icon-btn" disabled={busy} onClick={onCancel} aria-label="Fechar"><X/></button>
        <div><small>Editor Threadly</small><strong>{isVideo ? 'Editar clip' : 'Editar mídia'}</strong></div>
        <div className="editor-history"><button disabled={!undo.length || busy} onClick={goUndo}><Undo2 size={18}/></button><button disabled={!redo.length || busy} onClick={goRedo}><Redo2 size={18}/></button></div>
      </header>

      <section className="editor-preview" style={aspectStyle}>
        {isVideo ? <video src={url} style={previewStyle} controls playsInline muted={false}/> : <img src={url} style={previewStyle} alt="Prévia da edição"/>}
        {state.text && <span className="editor-text-overlay" style={{ top:`${state.textY ?? 82}%`, fontSize:`${Math.max(18,Math.min(72,state.textSize ?? 42))}px` }}>{state.text}</span>}
        {state.sticker && <span className="editor-sticker-overlay" style={{ left:`${state.stickerX ?? 82}%`, top:`${state.stickerY ?? 18}%`, fontSize:`${Math.max(24,Math.min(110,state.stickerSize ?? 64))}px` }}>{state.sticker}</span>}
      </section>

      <section className="editor-controls">
        <div className="editor-tool-title"><SlidersHorizontal size={17}/><strong>Ajustes</strong></div>
        <div className="editor-sliders">
          <label><span>Brilho <b>{state.brightness}</b></span><input type="range" min="50" max="150" value={state.brightness} onChange={e=>change({brightness:Number(e.target.value)})}/></label>
          <label><span>Contraste <b>{state.contrast}</b></span><input type="range" min="50" max="150" value={state.contrast} onChange={e=>change({contrast:Number(e.target.value)})}/></label>
          <label><span>Saturação <b>{state.saturation}</b></span><input type="range" min="0" max="180" value={state.saturation} onChange={e=>change({saturation:Number(e.target.value)})}/></label>
          <label><span>Temperatura <b>{state.warmth}</b></span><input type="range" min="-100" max="100" value={state.warmth} onChange={e=>change({warmth:Number(e.target.value)})}/></label>
        </div>

        <div className="editor-row">
          <div className="editor-tool-title"><Crop size={17}/><strong>Formato</strong></div>
          <div className="editor-chips">{aspects.map(aspect=><button key={aspect} className={state.aspect===aspect?'active':''} onClick={()=>change({aspect})}>{aspect}</button>)}</div>
        </div>
        <div className="editor-row editor-rotate"><button onClick={()=>rotate(-90)}><RotateCcw size={17}/> −90°</button><button onClick={()=>rotate(90)}><RotateCw size={17}/> +90°</button></div>

        {isVideo && duration > 0 && <div className="editor-trim"><div className="editor-tool-title"><strong>Cortar vídeo</strong><span>{state.trimStart.toFixed(1)}s — {(state.trimEnd ?? duration).toFixed(1)}s</span></div><label><span>Início</span><input type="range" min="0" max={Math.max(0,duration-.1)} step="0.1" value={state.trimStart} onChange={e=>change({trimStart:Math.min(Number(e.target.value),(state.trimEnd ?? duration)-.1)})}/></label><label><span>Fim</span><input type="range" min="0.1" max={duration} step="0.1" value={state.trimEnd ?? duration} onChange={e=>change({trimEnd:Math.max(Number(e.target.value),state.trimStart+.1)})}/></label></div>}

        <div className="editor-overlay-tools">
          <label><span><Type size={16}/> Texto</span><input value={state.text ?? ''} maxLength={80} placeholder="Escreva sobre a mídia" onChange={e=>change({text:e.target.value})}/></label>
          <label><span><SmilePlus size={16}/> Sticker</span><input value={state.sticker ?? ''} maxLength={8} placeholder="✨" onChange={e=>change({sticker:e.target.value})}/></label>
        </div>
        {(state.text || state.sticker) && <div className="editor-sliders compact">{state.text && <><label><span>Tamanho do texto</span><input type="range" min="18" max="90" value={state.textSize ?? 42} onChange={e=>change({textSize:Number(e.target.value)})}/></label><label><span>Altura do texto</span><input type="range" min="5" max="95" value={state.textY ?? 82} onChange={e=>change({textY:Number(e.target.value)})}/></label></>}{state.sticker && <><label><span>Tamanho do sticker</span><input type="range" min="24" max="140" value={state.stickerSize ?? 64} onChange={e=>change({stickerSize:Number(e.target.value)})}/></label><label><span>Horizontal</span><input type="range" min="5" max="95" value={state.stickerX ?? 82} onChange={e=>change({stickerX:Number(e.target.value)})}/></label><label><span>Vertical</span><input type="range" min="5" max="95" value={state.stickerY ?? 18} onChange={e=>change({stickerY:Number(e.target.value)})}/></label></>}</div>}
      </section>

      {error && <div className="form-status error editor-error">{error}</div>}
      {busy && <div className="editor-progress"><span style={{width:`${Math.round(progress*100)}%`}}/><small>{isVideo ? `Renderizando ${Math.round(progress*100)}%` : 'Renderizando imagem…'}</small></div>}
      <footer className="editor-actions"><button className="btn ghost" disabled={busy} onClick={()=>setState(clone(DEFAULT_MEDIA_EDIT))}>Redefinir</button><button className="btn primary" disabled={busy} onClick={()=>void apply()}>{busy?<Loader2 className="spin" size={17}/>:<Check size={17}/>} Usar edição</button></footer>
    </div>
  </dialog>
}
