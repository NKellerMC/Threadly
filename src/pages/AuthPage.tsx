import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import Brand from '../components/Brand'
import { useAuth } from '../context/AuthContext'

function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Não foi possível entrar agora.'
  if (message.includes('invalid-credential')) return 'Email ou senha incorretos.'
  if (message.includes('email-already-in-use')) return 'Esse email já está em uso.'
  if (message.includes('weak-password')) return 'Use uma senha mais forte.'
  if (message.includes('popup-closed')) return 'A janela do Google foi fechada antes de concluir o login.'
  if (message.includes('too-many-requests')) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
  if (message.includes('network-request-failed')) return 'Sem conexão com o serviço de login. Verifique sua internet.'
  return message
}

export default function AuthPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const isRegister = location.pathname.includes('register')
  const returnTo = (location.state as { from?: string } | null)?.from || '/'
  const { user, loading, signIn, register, signInGoogle, resetPassword } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [show, setShow] = useState(false)
  const [status, setStatus] = useState('')
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!loading && user) return <Navigate to={returnTo} replace/>

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setStatus('')
    setSuccess(false)

    if (isRegister && password !== confirmPassword) {
      setStatus('As senhas não coincidem.')
      return
    }

    setBusy(true)
    try {
      if (isRegister) await register(name.trim(), email.trim(), password)
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
            <div className="field"><UserRound size={18}/><input required autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Como você quer aparecer"/></div>
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
          <button className="btn primary auth-submit" disabled={busy || loading}>{busy ? <><Loader2 size={18} className="spin"/> Aguarde…</> : <>{isRegister ? 'Criar conta' : 'Entrar'} <ArrowRight size={18}/></>}</button>
        </form>

        <div className="divider"><span/>ou<span/></div>
        <button type="button" className="btn google" disabled={busy || loading} onClick={() => void signInGoogle().catch(error => setStatus(friendlyError(error)))}><b>G</b> Continuar com Google</button>
        <p className="auth-switch">{isRegister ? 'Já tem uma conta?' : 'Ainda não tem uma conta?'} <button type="button" onClick={switchMode}>{isRegister ? 'Entrar' : 'Criar conta'}</button></p>
        <p className="auth-footnote"><ShieldCheck size={14}/> Sua sessão fica protegida pelo Firebase Authentication.</p>
      </div>
    </section>
  </main>
}
