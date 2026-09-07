import {
  type User,
  createUserWithEmailAndPassword,
  getIdTokenResult,
  getRedirectResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { auth, functions, googleProvider } from '../lib/firebase'
import { firebaseConfigured } from '../lib/config'
import { syncProfile } from '../api/users'

type AuthContextValue = {
  user: User | null
  loading: boolean
  configured: boolean
  supabaseRoleReady: boolean
  signIn: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  signInGoogle: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  refreshRole: () => Promise<boolean>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function ensureRoleClaim(user: User): Promise<boolean> {
  const token = await getIdTokenResult(user, false)
  if (token.claims.role === 'authenticated') return true
  if (!functions) return false
  try {
    const ensureRole = httpsCallable(functions, 'ensureAuthenticatedRole')
    await ensureRole()
    const refreshed = await getIdTokenResult(user, true)
    return refreshed.claims.role === 'authenticated'
  } catch (error) {
    console.warn('Claim role=authenticated ainda não foi configurado no Firebase:', error)
    return false
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(firebaseConfigured)
  const [supabaseRoleReady, setSupabaseRoleReady] = useState(false)

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }
    void getRedirectResult(auth).catch((error) => console.warn('Falha no retorno do login por redirect:', error))
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      if (!nextUser) {
        setSupabaseRoleReady(false)
        setLoading(false)
        return
      }
      void ensureRoleClaim(nextUser)
        .then(async (ready) => {
          setSupabaseRoleReady(ready)
          await syncProfile({
            userId: nextUser.uid,
            email: nextUser.email,
            displayName: nextUser.displayName,
            avatarUrl: nextUser.photoURL,
          })
        })
        .finally(() => setLoading(false))
    })
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    configured: firebaseConfigured,
    supabaseRoleReady,
    signIn: async (email, password) => {
      if (!auth) throw new Error('Firebase ainda não foi configurado.')
      const credential = await signInWithEmailAndPassword(auth, email, password)
      setSupabaseRoleReady(await ensureRoleClaim(credential.user))
    },
    register: async (name, email, password) => {
      if (!auth) throw new Error('Firebase ainda não foi configurado.')
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(credential.user, { displayName: name })
      setSupabaseRoleReady(await ensureRoleClaim(credential.user))
    },
    signInGoogle: async () => {
      if (!auth) throw new Error('Firebase ainda não foi configurado.')
      const mobile = matchMedia('(max-width: 760px)').matches
      if (mobile) {
        await signInWithRedirect(auth, googleProvider)
        return
      }
      const credential = await signInWithPopup(auth, googleProvider)
      setSupabaseRoleReady(await ensureRoleClaim(credential.user))
    },
    resetPassword: async (email) => {
      if (!auth) throw new Error('Firebase ainda não foi configurado.')
      await sendPasswordResetEmail(auth, email)
    },
    refreshRole: async () => {
      if (!auth?.currentUser) return false
      const ready = await ensureRoleClaim(auth.currentUser)
      setSupabaseRoleReady(ready)
      return ready
    },
    signOut: async () => {
      if (auth) await firebaseSignOut(auth)
      setSupabaseRoleReady(false)
    },
  }), [user, loading, supabaseRoleReady])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return value
}
