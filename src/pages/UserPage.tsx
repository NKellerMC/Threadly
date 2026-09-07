import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import ProfileView from '../components/ProfileView'
import { getProfileByUsername } from '../api/users'
import { useAuth } from '../context/AuthContext'
import type { Profile } from '../lib/types'

export default function UserPage(){const{username=''}=useParams();const{user}=useAuth();const[profile,setProfile]=useState<Profile|null>(null);const[loading,setLoading]=useState(true);useEffect(()=>{setLoading(true);void getProfileByUsername(username).then(setProfile).finally(()=>setLoading(false))},[username]);if(loading)return <div className="page"><div className="center-status"><Loader2 className="spin"/> procurando perfil</div></div>;if(!profile)return <div className="page"><EmptyState title="Esse perfil não existe.">Ou o @ mudou, ou você encontrou um belo 404 social.</EmptyState></div>;return <ProfileView profile={profile} own={profile.id===user?.uid}/>}
