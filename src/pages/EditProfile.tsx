import { CheckCircle2, Loader2, Save, XCircle } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../components/Avatar'
import { getProfile, isUsernameAvailable, updateProfile } from '../api/users'
import { useAuth } from '../context/AuthContext'
import type { Profile } from '../lib/types'
import { normalizeUsername } from '../lib/validation'

type UsernameState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export default function EditProfile() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [originalUsername, setOriginalUsername] = useState('')
  const [usernameState, setUsernameState] = useState<UsernameState>('idle')
  const [bio, setBio] = useState('')
  const [website, setWebsite] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    void getProfile(user?.uid).then(p => {
      setProfile(p)
      if (p) {
        setName(p.displayName)
        setUsername(p.username)
        setOriginalUsername(p.username)
        setUsernameState('available')
        setBio(p.bio)
        setWebsite(p.website ?? '')
      }
    })
  }, [user?.uid])

  useEffect(() => {
    if (!profile) return
    const normalized = normalizeUsername(username)
    if (normalized === originalUsername) {
      setUsernameState('available')
      return
    }
    if (normalized.length < 3 || normalized !== username) {
      setUsernameState('invalid')
      return
    }

    setUsernameState('checking')
    const timer = window.setTimeout(() => {
      void isUsernameAvailable(normalized, user?.uid)
        .then(available => setUsernameState(available ? 'available' : 'taken'))
        .catch(() => setUsernameState('idle'))
    }, 350)
    return () => window.clearTimeout(timer)
  }, [profile, originalUsername, user?.uid, username])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (usernameState !== 'available') {
      setStatus(usernameState === 'taken' ? 'Esse @ já está em uso.' : 'Escolha um @ válido e disponível.')
      return
    }
    setBusy(true)
    setStatus('')
    try {
      await updateProfile({ displayName: name, username, bio, website })
      navigate('/profile')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Falha ao salvar.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="page narrow-page">
    <header className="page-header"><div><span className="eyebrow">Perfil</span><h1>Editar perfil</h1></div></header>
    <form className="settings-form" onSubmit={submit}>
      <div className="edit-avatar"><Avatar name={name || 'Você'} src={profile?.avatarUrl} size="lg"/><div><strong>Foto de perfil</strong><p>A foto atual vem do Firebase/Google.</p></div></div>
      <label className="stack-field"><span>Nome</span><input value={name} onChange={e => setName(e.target.value)} maxLength={60} required/></label>
      <label className="stack-field"><span>@usuário</span><div className={`username-edit-field ${usernameState}`}><input value={username} onChange={e => setUsername(normalizeUsername(e.target.value))} minLength={3} maxLength={24} required/>{usernameState === 'checking' && <Loader2 className="spin" size={16}/>} {usernameState === 'available' && <CheckCircle2 size={16}/>} {(usernameState === 'taken' || usernameState === 'invalid') && <XCircle size={16}/>}</div><small className={`username-hint ${usernameState}`}>{usernameState === 'checking' ? 'Verificando…' : usernameState === 'available' ? 'Disponível.' : usernameState === 'taken' ? 'Esse @ já está em uso.' : 'Use 3–24 caracteres: letras, números, ponto ou _.'}</small></label>
      <label className="stack-field"><span>Bio</span><textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={240}/></label>
      <label className="stack-field"><span>Site</span><input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..."/></label>
      {status && <div className="form-status error">{status}</div>}
      <div className="dialog-actions"><button type="button" className="btn ghost" onClick={() => navigate(-1)}>Cancelar</button><button className="btn primary" disabled={busy || usernameState !== 'available'}>{busy ? <Loader2 className="spin" size={17}/> : <Save size={17}/>} Salvar</button></div>
    </form>
  </div>
}
