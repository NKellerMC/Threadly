import { getAuth } from 'firebase-admin/auth'
import { initializeApp } from 'firebase-admin/app'
import { HttpsError, onCall } from 'firebase-functions/v2/https'

initializeApp()

/**
 * O Supabase Third-Party Auth exige `role: "authenticated"` no ID token do
 * Firebase para executar as consultas como o papel Postgres `authenticated`.
 *
 * Esta callable só aceita usuários já autenticados pelo Firebase e só altera os
 * custom claims da própria conta que fez a chamada.
 */
export const ensureAuthenticatedRole = onCall({ region: 'us-central1' }, async request => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'É necessário estar autenticado.')

  const auth = getAuth()
  const user = await auth.getUser(uid)
  if (user.customClaims?.role === 'authenticated') return { updated: false }

  await auth.setCustomUserClaims(uid, {
    ...(user.customClaims ?? {}),
    role: 'authenticated',
  })

  return { updated: true }
})
