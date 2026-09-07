import { Bell, Bookmark, Clapperboard, Compass, Heart, Home, LogOut, Menu, MessageCircleMore, Plus, Search, Settings, UserRound, Video } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Avatar from './Avatar'
import Brand from './Brand'
import CreateDialog from './CreateDialog'

const nav = [
  { to:'/', label:'Início', icon:Home },
  { to:'/clips', label:'Clips', icon:Clapperboard },
  { to:'/explore', label:'Explorar', icon:Compass },
  { to:'/messages', label:'Mensagens', icon:MessageCircleMore },
  { to:'/notifications', label:'Atividade', icon:Bell },
  { to:'/profile', label:'Perfil', icon:UserRound },
]

export default function AppShell() {
  const [createOpen, setCreateOpen] = useState(false)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const open = () => setCreateOpen(true)
    window.addEventListener('threadly:open-create', open)
    return () => window.removeEventListener('threadly:open-create', open)
  }, [])

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Threader'

  return <div className="shell">
    <aside className="sidebar">
      <div className="sidebar-top"><Brand/></div>
      <nav className="nav-list" aria-label="Navegação principal">
        {nav.map(({to,label,icon:Icon}) => <NavLink key={to} to={to} end={to === '/'} className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={22} strokeWidth={2}/><span>{label}</span></NavLink>)}
        <button className="nav-item nav-create" onClick={() => setCreateOpen(true)}><Plus size={22}/><span>Criar</span></button>
      </nav>
      <div className="sidebar-bottom">
        <div className="mini-links">
          <NavLink to="/saved"><Bookmark size={17}/><span>Salvos</span></NavLink>
          <NavLink to="/liked"><Heart size={17}/><span>Curtidos</span></NavLink>
          <NavLink to="/studio"><Video size={17}/><span>Studio</span></NavLink>
        </div>
        <button className="account-chip" onClick={() => navigate('/profile')}>
          <Avatar name={displayName} src={user?.photoURL} size="sm"/>
          <span className="account-copy"><strong>{displayName}</strong><small>{user?.email}</small></span>
          <Menu size={18}/>
        </button>
        <NavLink to="/settings" className="nav-item subtle"><Settings size={20}/><span>Configurações</span></NavLink>
        <button className="nav-item subtle" onClick={() => void signOut()}><LogOut size={20}/><span>Sair</span></button>
      </div>
    </aside>

    <header className="mobile-topbar">
      <Brand/>
      <div className="top-actions">
        <button className="icon-btn" onClick={() => navigate('/search')} aria-label="Pesquisar"><Search size={21}/></button>
        <button className="icon-btn" onClick={() => navigate('/messages')} aria-label="Mensagens"><MessageCircleMore size={21}/></button>
      </div>
    </header>

    <main className="content"><Outlet/></main>

    <nav className="mobile-nav" aria-label="Navegação móvel">
      <NavLink to="/" end aria-label="Início"><Home size={23}/></NavLink>
      <NavLink to="/clips" aria-label="Clips"><Clapperboard size={23}/></NavLink>
      <NavLink to="/explore" aria-label="Explorar"><Compass size={23}/></NavLink>
      <button aria-label="Criar" onClick={() => setCreateOpen(true)} className="mobile-create"><Plus size={22}/></button>
      <NavLink to="/profile" aria-label="Perfil"><UserRound size={23}/></NavLink>
    </nav>

    <CreateDialog open={createOpen} onClose={() => setCreateOpen(false)}/>
  </div>
}
