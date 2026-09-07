import { type FirebaseApp, getApps, initializeApp } from 'firebase/app'
import { type Auth, GoogleAuthProvider, browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth'
import { type Functions, getFunctions } from 'firebase/functions'
import { env, firebaseConfigured } from './config'

let app: FirebaseApp | null = null
let auth: Auth | null = null
let functions: Functions | null = null

if (firebaseConfigured) {
  app = getApps()[0] ?? initializeApp(env.firebase)
  auth = getAuth(app)
  functions = getFunctions(app, env.firebaseFunctionsRegion)
  void setPersistence(auth, browserLocalPersistence)
}

export { app, auth, functions }
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })
