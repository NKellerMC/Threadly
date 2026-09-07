import {
  type User,
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { syncProfile } from '../api/users'
import { auth, googleProvider } from '../lib/firebase'

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

async function prepareUser(user: User, forceRefresh = false): Promise<boolean> {
  await user.getIdToken(forceRefresh)
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
    },
    register: async (name, email, password) => {
      if (!auth) throw new Error('O serviço de cadastro está indisponível.')
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(credential.user, { displayName: name })
      await credential.user.reload()
      const ready = await prepareUser(credential.user, true)
      setSupabaseRoleReady(ready)
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
    },
    resetPassword: async email => {
      if (!auth) throw new Error('O serviço de conta está indisponível.')
      await sendPasswordResetEmail(auth, email)
    },
    refreshRole: async () => {
      if (!auth?.currentUser) return false
      try {
        const ready = await prepareUser(auth.currentUser, true)
        setSupabaseRoleReady(ready)
        return ready
      } catch {
        setSupabaseRoleReady(false)
        return false
      }
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
