import { ExternalLink, History, KeyRound, LogOut, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Settings() {
  const { user, resetPassword, signOut } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  const sendReset = async () => {
    if (!user?.email) return
    setBusy(true)
    setStatus('')
    try {
      await resetPassword(user.email)
      setStatus('Enviamos um link de redefinição para o seu email.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Não foi possível enviar o email agora.')
    } finally {
      setBusy(false)
    }
  }

  const logout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return <div className="page narrow-page">
    <header className="page-header"><div><span className="eyebrow">Sua conta</span><h1>Configurações</h1></div></header>

    <section className="settings-section">
      <h2>Conta</h2>
      <div className="settings-row"><span>Email</span><strong>{user?.email}</strong></div>
      <div className="settings-row"><span>Nome</span><strong>{user?.displayName || 'Threader'}</strong></div>
      <Link className="settings-link" to="/edit-profile">Editar perfil <ExternalLink size={16}/></Link>
      {user?.email && <button className="settings-link" disabled={busy} onClick={() => void sendReset()}><span><KeyRound size={16}/> Redefinir senha</span><ExternalLink size={16}/></button>}
      {status && <div className="form-status success">{status}</div>}
    </section>

    <section className="settings-section">
      <h2>Privacidade e atividade</h2>
      <Link className="settings-link" to="/history"><span><History size={16}/> Histórico de vídeos</span><ExternalLink size={16}/></Link>
      <Link className="settings-link" to="/saved"><span>Itens salvos</span><ExternalLink size={16}/></Link>
      <div className="security-note"><ShieldCheck size={20}/><p>Seus dados privados de conta, mensagens e histórico só ficam disponíveis para a sua sessão autenticada.</p></div>
    </section>

    <section className="settings-section">
      <h2>Sessão</h2>
      <button className="settings-link danger-link" onClick={() => void logout()}><span><LogOut size={16}/> Sair do Threadly</span><ExternalLink size={16}/></button>
    </section>

    <section className="settings-section">
      <h2>Sobre</h2>
      <div className="settings-row"><span>Versão</span><strong>Threadly 3.2</strong></div>
      <button className="settings-link" onClick={() => window.open('https://github.com/NKellerMC/Threadly', '_blank')}><span>Repositório</span><ExternalLink size={16}/></button>
    </section>
  </div>
}
