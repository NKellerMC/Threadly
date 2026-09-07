import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import ProfileView from '../components/ProfileView'
import { getProfile } from '../api/users'
import { useAuth } from '../context/AuthContext'
import type { Profile as ProfileType } from '../lib/types'

export default function Profile(){const{user}=useAuth();const[profile,setProfile]=useState<ProfileType|null>(null);const[loading,setLoading]=useState(true);useEffect(()=>{void getProfile(user?.uid).then(setProfile).finally(()=>setLoading(false))},[user?.uid]);if(loading)return <div className="page"><div className="center-status"><Loader2 className="spin"/> carregando perfil</div></div>;if(!profile)return <div className="page"><EmptyState title="Perfil ainda não existe.">Entre na conta novamente para sincronizar.</EmptyState></div>;return <ProfileView profile={profile} own/>}
