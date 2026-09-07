import {
  type User,
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
} from 'firebase/auth'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { deleteOwnProfile, isUsernameAvailable, syncProfile } from '../api/users'
import { auth, googleProvider } from '../lib/firebase'

type AuthContextValue = {
  user: User | null
  loading: boolean
  supabaseRoleReady: boolean
  signIn: (email: string, password: string) => Promise<void>
  register: (name: string, username: string, email: string, password: string) => Promise<void>
  signInGoogle: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  sendVerification: () => Promise<void>
  requestEmailChange: (newEmail: string, currentPassword?: string) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  deleteAccount: (currentPassword?: string) => Promise<void>
  refreshRole: () => Promise<boolean>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function prepareUser(user: User, options?: { forceRefresh?: boolean; preferredUsername?: string | null }): Promise<boolean> {
  await user.getIdToken(options?.forceRefresh ?? false)
  await syncProfile({
    userId: user.uid,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.photoURL,
    preferredUsername: options?.preferredUsername ?? null,
  })
  return true
}

function usesPassword(user: User): boolean {
  return user.providerData.some(provider => provider.providerId === 'password')
}

function usesGoogle(user: User): boolean {
  return user.providerData.some(provider => provider.providerId === 'google.com')
}

async function reauthenticate(user: User, currentPassword?: string): Promise<void> {
  if (usesPassword(user)) {
    if (!user.email || !currentPassword) throw new Error('Digite sua senha atual para confirmar esta alteração.')
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword))
    return
  }

  if (usesGoogle(user)) {
    await reauthenticateWithPopup(user, googleProvider)
    return
  }

  throw new Error('Não foi possível confirmar novamente a identidade desta conta.')
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
    register: async (name, username, email, password) => {
      if (!auth) throw new Error('O serviço de cadastro está indisponível.')
      if (!await isUsernameAvailable(username)) {
        throw new Error('Esse @ já está em uso. Escolha outro nome de usuário.')
      }

      const credential = await createUserWithEmailAndPassword(auth, email, password)
      try {
        await updateProfile(credential.user, { displayName: name })
        await credential.user.reload()
        const ready = await prepareUser(credential.user, { forceRefresh: true, preferredUsername: username })
        setSupabaseRoleReady(ready)
      } catch (error) {
        await deleteUser(credential.user).catch(() => undefined)
        throw error
      }
    },
    signInGoogle: async () => {
      if (!auth) throw new Error('O serviço de login está indisponível.')
      const credential = await signInWithPopup(auth, googleProvider)
      const ready = await prepareUser(credential.user)
      setSupabaseRoleReady(ready)
    },
    resetPassword: async email => {
      if (!auth) throw new Error('O serviço de conta está indisponível.')
      await sendPasswordResetEmail(auth, email)
    },
    sendVerification: async () => {
      if (!auth?.currentUser) throw new Error('Sua sessão expirou.')
      if (auth.currentUser.emailVerified) return
      await sendEmailVerification(auth.currentUser)
    },
    requestEmailChange: async (newEmail, currentPassword) => {
      if (!auth?.currentUser) throw new Error('Sua sessão expirou.')
      const email = newEmail.trim().toLowerCase()
      if (!email || email === auth.currentUser.email?.toLowerCase()) {
        throw new Error('Digite um email diferente do atual.')
      }
      await reauthenticate(auth.currentUser, currentPassword)
      await verifyBeforeUpdateEmail(auth.currentUser, email)
    },
    changePassword: async (currentPassword, newPassword) => {
      if (!auth?.currentUser) throw new Error('Sua sessão expirou.')
      if (!usesPassword(auth.currentUser)) {
        throw new Error('Esta conta entra pelo Google e não possui uma senha do Threadly para alterar.')
      }
      if (newPassword.length < 8) throw new Error('A nova senha precisa ter pelo menos 8 caracteres.')
      await reauthenticate(auth.currentUser, currentPassword)
      await updatePassword(auth.currentUser, newPassword)
    },
    deleteAccount: async currentPassword => {
      const currentUser = auth?.currentUser
      if (!currentUser) throw new Error('Sua sessão expirou.')
      await reauthenticate(currentUser, currentPassword)
      await deleteOwnProfile()
      await deleteUser(currentUser)
      setSupabaseRoleReady(false)
    },
    refreshRole: async () => {
      if (!auth?.currentUser) return false
      try {
        const ready = await prepareUser(auth.currentUser, { forceRefresh: true })
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
