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
import { syncProfile } from '../api/users'
import { auth, functions, googleProvider } from '../lib/firebase'

type AuthContextValue = {
  user: User | null
  loading: boolean
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
  } catch {
    return false
  }
}

async function prepareUser(user: User): Promise<boolean> {
  const ready = await ensureRoleClaim(user)
  if (!ready) return false
  await syncProfile({
    userId: user.uid,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.photoURL,
  })
  return true
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [supabaseRoleReady, setSupabaseRoleReady] = useState(false)

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }

    void getRedirectResult(auth).catch(() => undefined)
    return onAuthStateChanged(auth, nextUser => {
      setUser(nextUser)
      if (!nextUser) {
        setSupabaseRoleReady(false)
        setLoading(false)
        return
      }

      setLoading(true)
      void prepareUser(nextUser)
        .then(setSupabaseRoleReady)
        .catch(() => setSupabaseRoleReady(false))
        .finally(() => setLoading(false))
    })
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    supabaseRoleReady,
    signIn: async (email, password) => {
      if (!auth) throw new Error('O serviço de login está indisponível.')
      const credential = await signInWithEmailAndPassword(auth, email, password)
      const ready = await prepareUser(credential.user)
      setSupabaseRoleReady(ready)
      if (!ready) throw new Error('Sua conta entrou, mas não foi possível concluir a sessão. Tente novamente em instantes.')
    },
    register: async (name, email, password) => {
      if (!auth) throw new Error('O serviço de cadastro está indisponível.')
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(credential.user, { displayName: name })
      const ready = await prepareUser(credential.user)
      setSupabaseRoleReady(ready)
      if (!ready) throw new Error('Sua conta foi criada, mas não foi possível concluir a sessão. Entre novamente em instantes.')
    },
    signInGoogle: async () => {
      if (!auth) throw new Error('O serviço de login está indisponível.')
      const mobile = matchMedia('(max-width: 760px)').matches
      if (mobile) {
        await signInWithRedirect(auth, googleProvider)
        return
      }
      const credential = await signInWithPopup(auth, googleProvider)
      const ready = await prepareUser(credential.user)
      setSupabaseRoleReady(ready)
      if (!ready) throw new Error('Sua conta entrou, mas não foi possível concluir a sessão. Tente novamente em instantes.')
    },
    resetPassword: async email => {
      if (!auth) throw new Error('O serviço de conta está indisponível.')
      await sendPasswordResetEmail(auth, email)
    },
    refreshRole: async () => {
      if (!auth?.currentUser) return false
      const ready = await prepareUser(auth.currentUser)
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
