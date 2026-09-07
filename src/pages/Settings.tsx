import { AtSign, CheckCircle2, ExternalLink, History, KeyRound, LockKeyhole, LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function friendlyAccountError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Não foi possível concluir a alteração.'
  if (message.includes('requires-recent-login')) return 'Por segurança, confirme sua identidade novamente e tente outra vez.'
  if (message.includes('wrong-password') || message.includes('invalid-credential')) return 'A senha atual está incorreta.'
  if (message.includes('email-already-in-use')) return 'Esse email já pertence a outra conta.'
  if (message.includes('invalid-email')) return 'Digite um email válido.'
  if (message.includes('weak-password')) return 'A nova senha é muito fraca.'
  if (message.includes('popup-closed')) return 'A confirmação pelo Google foi fechada antes de terminar.'
  if (message.includes('popup-blocked')) return 'O navegador bloqueou a janela de confirmação do Google.'
  return message
}

export default function Settings() {
  const { user, resetPassword, sendVerification, requestEmailChange, changePassword, signOut } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState('')
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [newEmail, setNewEmail] = useState(user?.email ?? '')
  const [emailPassword, setEmailPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const hasPassword = useMemo(() => user?.providerData.some(provider => provider.providerId === 'password') ?? false, [user])
  const providerNames = useMemo(() => {
    const names = user?.providerData.map(provider => provider.providerId === 'google.com' ? 'Google' : provider.providerId === 'password' ? 'Email e senha' : provider.providerId) ?? []
    return [...new Set(names)]
  }, [user])

  const run = async (key: string, action: () => Promise<void>, success: string) => {
    setBusy(key)
    setStatus(null)
    try {
      await action()
      setStatus({ type: 'success', text: success })
    } catch (error) {
      setStatus({ type: 'error', text: friendlyAccountError(error) })
    } finally {
      setBusy('')
    }
  }

  const changeEmail = async (event: FormEvent) => {
    event.preventDefault()
    await run('email', () => requestEmailChange(newEmail, hasPassword ? emailPassword : undefined), `Enviamos uma confirmação para ${newEmail.trim()}. O email só muda depois que você confirmar.`)
    setEmailPassword('')
  }

  const updateAccountPassword = async (event: FormEvent) => {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', text: 'As novas senhas não coincidem.' })
      return
    }
    await run('password', () => changePassword(currentPassword, newPassword), 'Senha alterada com sucesso.')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const sendReset = async () => {
    if (!user?.email) return
    await run('reset', () => resetPassword(user.email!), 'Enviamos um link de redefinição para o seu email.')
  }

  const verifyEmail = async () => {
    await run('verify', sendVerification, 'Email de verificação enviado. Abra sua caixa de entrada para concluir.')
  }

  const logout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return <div className="page narrow-page account-settings-page">
    <header className="page-header"><div><span className="eyebrow">Sua conta</span><h1>Configurações</h1></div></header>

    {status && <div className={`form-status account-status ${status.type}`}>{status.text}</div>}

    <section className="settings-section">
      <div className="settings-section-title"><div><UserRound size={18}/><h2>Perfil público</h2></div><span>Visível para outras pessoas</span></div>
      <div className="settings-row"><span>Nome</span><strong>{user?.displayName || 'Threader'}</strong></div>
      <Link className="settings-link" to="/edit-profile"><span><AtSign size={16}/> Nome, @usuário, bio e site</span><ExternalLink size={16}/></Link>
    </section>

    <section className="settings-section private-settings">
      <div className="settings-section-title"><div><ShieldCheck size={18}/><h2>Conta privada</h2></div><span>Só você vê estes dados</span></div>
      <div className="settings-row"><span>Email atual</span><strong>{user?.email || 'Sem email'}</strong></div>
      <div className="settings-row"><span>Status</span><strong className={user?.emailVerified ? 'verified' : 'unverified'}>{user?.emailVerified ? 'Verificado' : 'Não verificado'}</strong></div>
      <div className="settings-row"><span>Login conectado</span><strong>{providerNames.join(' + ') || 'Firebase'}</strong></div>

      {!user?.emailVerified && user?.email && <button className="settings-link" disabled={Boolean(busy)} onClick={() => void verifyEmail()}><span><CheckCircle2 size={16}/> Verificar email</span><ExternalLink size={16}/></button>}

      <form className="account-form" onSubmit={changeEmail}>
        <div className="account-form-heading"><Mail size={17}/><div><strong>Alterar email</strong><span>O novo endereço precisa ser confirmado antes da troca.</span></div></div>
        <label className="stack-field"><span>Novo email</span><input type="email" autoComplete="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required/></label>
        {hasPassword && <label className="stack-field"><span>Senha atual</span><input type="password" autoComplete="current-password" value={emailPassword} onChange={e => setEmailPassword(e.target.value)} required placeholder="Confirme sua identidade"/></label>}
        {!hasPassword && <p className="account-helper">Ao salvar, o Google abrirá uma janela para confirmar sua identidade.</p>}
        <button className="btn ghost account-action" disabled={Boolean(busy) || newEmail.trim().toLowerCase() === user?.email?.toLowerCase()}>{busy === 'email' ? 'Enviando…' : 'Alterar email'}</button>
      </form>
    </section>

    <section className="settings-section">
      <div className="settings-section-title"><div><LockKeyhole size={18}/><h2>Senha e segurança</h2></div></div>
      {hasPassword ? <form className="account-form" onSubmit={updateAccountPassword}>
        <label className="stack-field"><span>Senha atual</span><input type="password" autoComplete="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required/></label>
        <label className="stack-field"><span>Nova senha</span><input type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} required/></label>
        <label className="stack-field"><span>Confirmar nova senha</span><input type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required/></label>
        <button className="btn ghost account-action" disabled={Boolean(busy)}>{busy === 'password' ? 'Salvando…' : 'Trocar senha'}</button>
      </form> : <div className="security-note"><ShieldCheck size={20}/><p>Esta conta usa Google para entrar. A autenticação principal é gerenciada pelo Google, então não há uma senha local do Threadly para trocar.</p></div>}
      {user?.email && <button className="settings-link" disabled={Boolean(busy)} onClick={() => void sendReset()}><span><KeyRound size={16}/> Enviar link de redefinição de senha</span><ExternalLink size={16}/></button>}
    </section>

    <section className="settings-section">
      <h2>Privacidade e atividade</h2>
      <Link className="settings-link" to="/history"><span><History size={16}/> Histórico de vídeos</span><ExternalLink size={16}/></Link>
      <Link className="settings-link" to="/saved"><span>Itens salvos</span><ExternalLink size={16}/></Link>
      <div className="security-note"><ShieldCheck size={20}/><p>Mensagens, histórico e itens salvos continuam protegidos pelas regras de acesso do Supabase e pela sua sessão Firebase.</p></div>
    </section>

    <section className="settings-section">
      <h2>Sessão</h2>
      <button className="settings-link danger-link" onClick={() => void logout()}><span><LogOut size={16}/> Sair do Threadly</span><ExternalLink size={16}/></button>
    </section>

    <section className="settings-section">
      <h2>Sobre</h2>
      <div className="settings-row"><span>Versão</span><strong>Threadly 3.3</strong></div>
      <button className="settings-link" onClick={() => window.open('https://github.com/NKellerMC/Threadly', '_blank')}><span>Repositório</span><ExternalLink size={16}/></button>
    </section>
  </div>
}
