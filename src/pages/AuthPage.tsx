import { ArrowRight, AtSign, CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck, UserRound, XCircle } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { isUsernameAvailable } from '../api/users'
import Brand from '../components/Brand'
import { useAuth } from '../context/AuthContext'
import { normalizeUsername } from '../lib/validation'

function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Não foi possível entrar agora.'
  if (message.includes('invalid-credential')) return 'Email ou senha incorretos.'
  if (message.includes('email-already-in-use')) return 'Esse email já está em uso.'
  if (message.includes('weak-password')) return 'Use uma senha mais forte.'
  if (message.includes('popup-closed')) return 'A janela do Google foi fechada antes de concluir o login.'
  if (message.includes('popup-blocked')) return 'O navegador bloqueou a janela do Google. Permita pop-ups para o Threadly e tente de novo.'
  if (message.includes('account-exists-with-different-credential')) return 'Já existe uma conta com esse email usando outro método de login.'
  if (message.includes('too-many-requests')) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
  if (message.includes('network-request-failed')) return 'Sem conexão com o serviço de login. Verifique sua internet.'
  return message
}

type UsernameState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export default function AuthPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const isRegister = location.pathname.includes('register')
  const returnTo = (location.state as { from?: string } | null)?.from || '/'
  const { user, loading, signIn, register, signInGoogle, resetPassword } = useAuth()
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [usernameState, setUsernameState] = useState<UsernameState>('idle')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [show, setShow] = useState(false)
  const [status, setStatus] = useState('')
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isRegister) {
      setUsernameState('idle')
      return
    }

    const normalized = normalizeUsername(username)
    if (!normalized) {
      setUsernameState('idle')
      return
    }
    if (normalized.length < 3 || normalized !== username.trim().toLowerCase()) {
      setUsernameState('invalid')
      return
    }

    setUsernameState('checking')
    const timer = window.setTimeout(() => {
      void isUsernameAvailable(normalized)
        .then(available => setUsernameState(available ? 'available' : 'taken'))
        .catch(() => setUsernameState('idle'))
    }, 350)

    return () => window.clearTimeout(timer)
  }, [isRegister, username])

  if (!loading && user) return <Navigate to={returnTo} replace/>

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setStatus('')
    setSuccess(false)

    if (isRegister && password !== confirmPassword) {
      setStatus('As senhas não coincidem.')
      return
    }

    if (isRegister && usernameState !== 'available') {
      setStatus(usernameState === 'taken' ? 'Esse @ já está em uso.' : 'Escolha um @ válido e disponível antes de criar a conta.')
      return
    }

    setBusy(true)
    try {
      if (isRegister) await register(name.trim(), normalizeUsername(username), email.trim(), password)
      else await signIn(email.trim(), password)
      navigate(returnTo, { replace: true })
    } catch (error) {
      setStatus(friendlyError(error))
    } finally {
      setBusy(false)
    }
  }

  const reset = async () => {
    if (!email.trim()) {
      setStatus('Digite seu email primeiro.')
      return
    }
    setBusy(true)
    setStatus('')
    setSuccess(false)
    try {
      await resetPassword(email.trim())
      setStatus('Enviamos o link para redefinir sua senha.')
      setSuccess(true)
    } catch (error) {
      setStatus(friendlyError(error))
    } finally {
      setBusy(false)
    }
  }

  const switchMode = () => {
    setStatus('')
    setSuccess(false)
    navigate(isRegister ? '/login' : '/register', { replace: true, state: location.state })
  }

  const googleLogin = async () => {
    setBusy(true)
    setStatus('')
    try {
      await signInGoogle()
      navigate(returnTo, { replace: true })
    } catch (error) {
      setStatus(friendlyError(error))
    } finally {
      setBusy(false)
    }
  }

  return <main className="auth-page">
    <section className="auth-showcase" aria-hidden="true">
      <div className="auth-brand"><Brand/></div>
      <div className="showcase-copy">
        <span className="eyebrow">Threadly</span>
        <h1>Ideias têm<br/>espaço para<br/><em>respirar.</em></h1>
        <p>Threads para conversar. Clips para mostrar. Mensagens para falar sem transformar tudo em palco.</p>
      </div>
      <div className="showcase-thread">
        <span className="mini-avatar">T</span>
        <div>
          <strong>Threadly</strong>
          <p>Uma rede social fica melhor quando as pessoas vêm antes das métricas.</p>
          <small>converse · descubra · compartilhe</small>
        </div>
      </div>
    </section>

    <section className="auth-panel">
      <div className="auth-box">
        <div className="mobile-auth-brand"><Brand/></div>
        <div className="auth-tabs" role="tablist" aria-label="Acesso ao Threadly">
          <button type="button" className={!isRegister ? 'active' : ''} onClick={() => isRegister && switchMode()}>Entrar</button>
          <button type="button" className={isRegister ? 'active' : ''} onClick={() => !isRegister && switchMode()}>Criar conta</button>
        </div>
        <span className="eyebrow">{isRegister ? 'Sua conta' : 'Bem-vindo de volta'}</span>
        <h2>{isRegister ? 'Comece no Threadly.' : 'Entre no Threadly.'}</h2>
        <p className="auth-subtitle">{isRegister ? 'Crie uma conta para publicar, seguir pessoas e conversar.' : 'Use sua conta para continuar de onde parou.'}</p>

        <form onSubmit={submit}>
          {isRegister && <label>
            <span>Nome</span>
            <div className="field"><UserRound size={18}/><input required autoComplete="name" value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder="Como você quer aparecer"/></div>
          </label>}
          {isRegister && <label>
            <span>Nome de usuário</span>
            <div className={`field username-field ${usernameState}`}><AtSign size={18}/><input required autoComplete="username" value={username} onChange={e => setUsername(normalizeUsername(e.target.value))} minLength={3} maxLength={24} placeholder="seu.usuario"/>{usernameState === 'checking' && <Loader2 size={16} className="spin"/>}{usernameState === 'available' && <CheckCircle2 size={16}/>} {(usernameState === 'taken' || usernameState === 'invalid') && <XCircle size={16}/>}</div>
            <small className={`username-hint ${usernameState}`}>{usernameState === 'checking' ? 'Verificando disponibilidade…' : usernameState === 'available' ? 'Esse @ está disponível.' : usernameState === 'taken' ? 'Esse @ já pertence a outra pessoa.' : usernameState === 'invalid' ? 'Use de 3 a 24 caracteres: letras, números, ponto ou _.': 'Seu @ é único e pode ser alterado depois.'}</small>
          </label>}
          <label>
            <span>Email</span>
            <div className="field"><Mail size={18}/><input required autoComplete="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@exemplo.com"/></div>
          </label>
          <label>
            <span>Senha</span>
            <div className="field"><LockKeyhole size={18}/><input required minLength={8} autoComplete={isRegister ? 'new-password' : 'current-password'} type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo de 8 caracteres"/><button type="button" onClick={() => setShow(v => !v)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>{show ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>
          </label>
          {isRegister && <label>
            <span>Confirme a senha</span>
            <div className="field"><LockKeyhole size={18}/><input required minLength={8} autoComplete="new-password" type={show ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Digite a mesma senha"/></div>
          </label>}
          {!isRegister && <button type="button" className="forgot-link" onClick={() => void reset()}>Esqueci minha senha</button>}
          {status && <div className={success ? 'form-status success' : 'form-status error'}>{status}</div>}
          <button className="btn primary auth-submit" disabled={busy || loading || (isRegister && usernameState !== 'available')}>{busy ? <><Loader2 size={18} className="spin"/> Aguarde…</> : <>{isRegister ? 'Criar conta' : 'Entrar'} <ArrowRight size={18}/></>}</button>
        </form>

        <div className="divider"><span/>ou<span/></div>
        <button type="button" className="btn google" disabled={busy || loading} onClick={() => void googleLogin()}><b>G</b> Continuar com Google</button>
        <p className="auth-switch">{isRegister ? 'Já tem uma conta?' : 'Ainda não tem uma conta?'} <button type="button" onClick={switchMode}>{isRegister ? 'Entrar' : 'Criar conta'}</button></p>
        <p className="auth-footnote"><ShieldCheck size={14}/> Sua sessão fica protegida pelo Firebase Authentication.</p>
      </div>
    </section>
  </main>
}
