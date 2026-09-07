import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AppShell from './components/AppShell'
import Brand from './components/Brand'
import { useAuth } from './context/AuthContext'
import AuthPage from './pages/AuthPage'
import Clips from './pages/Clips'
import EditProfile from './pages/EditProfile'
import Explore from './pages/Explore'
import Hashtag from './pages/Hashtag'
import History from './pages/History'
import Home from './pages/Home'
import LikedVideos from './pages/LikedVideos'
import Messages from './pages/Messages'
import Notifications from './pages/Notifications'
import PostPage from './pages/PostPage'
import Profile from './pages/Profile'
import Saved from './pages/Saved'
import SearchPage from './pages/SearchPage'
import Settings from './pages/Settings'
import Studio from './pages/Studio'
import Trending from './pages/Trending'
import UserPage from './pages/UserPage'
import Watch from './pages/Watch'

function ProtectedShell() {
  const { user, loading, supabaseRoleReady, refreshRole, signOut } = useAuth()
  const location = useLocation()

  if (loading) {
    return <main className="auth-loading"><Brand/><span>Preparando seu Threadly…</span></main>
  }

  if (!user) {
    const from = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to="/login" replace state={{ from }} />
  }

  if (!supabaseRoleReady) {
    return <main className="auth-loading auth-session-error">
      <Brand/>
      <strong>Não foi possível concluir sua sessão.</strong>
      <span>O login foi reconhecido, mas o acesso aos seus dados ainda não ficou pronto.</span>
      <div>
        <button className="btn primary" onClick={() => void refreshRole()}>Tentar novamente</button>
        <button className="btn ghost" onClick={() => void signOut()}>Sair</button>
      </div>
    </main>
  }

  return <AppShell/>
}

export default function App() {
  return <Routes>
    <Route path="/login" element={<AuthPage/>}/>
    <Route path="/register" element={<AuthPage/>}/>
    <Route element={<ProtectedShell/>}>
      <Route index element={<Home/>}/>
      <Route path="/following" element={<Home followingOnly/>}/>
      <Route path="/clips" element={<Clips/>}/>
      <Route path="/explore" element={<Explore/>}/>
      <Route path="/search" element={<SearchPage/>}/>
      <Route path="/notifications" element={<Notifications/>}/>
      <Route path="/messages" element={<Messages/>}/>
      <Route path="/profile" element={<Profile/>}/>
      <Route path="/u/:username" element={<UserPage/>}/>
      <Route path="/edit-profile" element={<EditProfile/>}/>
      <Route path="/saved" element={<Saved/>}/>
      <Route path="/liked" element={<LikedVideos/>}/>
      <Route path="/studio" element={<Studio/>}/>
      <Route path="/history" element={<History/>}/>
      <Route path="/trending" element={<Trending/>}/>
      <Route path="/hashtag/:tag" element={<Hashtag/>}/>
      <Route path="/watch/:id" element={<Watch/>}/>
      <Route path="/post/:id" element={<PostPage/>}/>
      <Route path="/settings" element={<Settings/>}/>
    </Route>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>
}
