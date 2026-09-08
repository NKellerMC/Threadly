import { type FirebaseApp, getApps, initializeApp } from 'firebase/app'
import { type Auth, GoogleAuthProvider, browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth'
import { env, firebaseConfigured } from './config'

let app: FirebaseApp | null = null
let auth: Auth | null = null

if (firebaseConfigured) {
  app = getApps()[0] ?? initializeApp(env.firebase)
  auth = getAuth(app)
  void setPersistence(auth, browserLocalPersistence)
}

export { app, auth }
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })
