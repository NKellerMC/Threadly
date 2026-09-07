import { getAuth } from 'firebase-admin/auth'
import { initializeApp } from 'firebase-admin/app'
import { HttpsError, onCall } from 'firebase-functions/v2/https'

initializeApp()

/**
 * Supabase Third-Party Auth exige o claim role="authenticated" no ID token
 * do Firebase. A função só pode alterar os claims do próprio usuário autenticado.
 */
export const ensureAuthenticatedRole = onCall(async (request) => {
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
