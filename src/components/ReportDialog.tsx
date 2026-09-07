import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Loader2, ShieldAlert, X } from 'lucide-react'
import { reportContent } from '../api/reports'

export default function ReportDialog({ open, onClose, targetType, targetId }: { open: boolean; onClose: () => void; targetType: 'video'|'thread'|'profile'; targetId: string }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [reason, setReason] = useState('spam')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  useEffect(() => { const d=ref.current; if(!d)return; if(open&&!d.open)d.showModal(); if(!open&&d.open)d.close() }, [open])
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setStatus('')
    try { await reportContent({ targetType, targetId, reason, details }); setStatus('Denúncia enviada.'); setTimeout(onClose, 550) }
    catch(error){ setStatus(error instanceof Error ? error.message : 'Falha ao enviar denúncia.') }
    finally{ setBusy(false) }
  }
  return <dialog ref={ref} className="sheet-dialog report-dialog" onClose={onClose}><form onSubmit={submit}>
    <div className="sheet-head"><div><span className="eyebrow">Segurança</span><h2>Denunciar conteúdo</h2></div><button type="button" className="icon-btn" onClick={onClose}><X size={20}/></button></div>
    <div className="report-intro"><ShieldAlert size={20}/><p>Use denúncia para abuso real. “Discordei da pessoa” não é categoria de segurança.</p></div>
    <label className="stack-field"><span>Motivo</span><select value={reason} onChange={e=>setReason(e.target.value)}><option value="spam">Spam</option><option value="harassment">Assédio</option><option value="hate">Ódio ou discriminação</option><option value="violence">Violência</option><option value="sexual">Conteúdo sexual impróprio</option><option value="copyright">Direitos autorais</option><option value="other">Outro</option></select></label>
    <label className="stack-field"><span>Detalhes</span><textarea value={details} onChange={e=>setDetails(e.target.value)} maxLength={800} placeholder="Contexto adicional (opcional)"/></label>
    {status && <div className="form-status">{status}</div>}
    <div className="dialog-actions"><button type="button" className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn primary" disabled={busy}>{busy && <Loader2 size={17} className="spin"/>} Enviar</button></div>
  </form></dialog>
}
