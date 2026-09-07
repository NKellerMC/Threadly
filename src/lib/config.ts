const DEFAULT_SUPABASE_URL = 'https://qfuwowgbxaxswypjdrzu.supabase.co'
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_QoJh_wIuRG4X4GAhw9wDAg_m-s46G0a'

export const env = {
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
  },
  firebaseFunctionsRegion: import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION ?? 'us-central1',
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL,
    key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY,
  },
}

export const firebaseConfigured = Boolean(
  env.firebase.apiKey && env.firebase.authDomain && env.firebase.projectId && env.firebase.appId,
)
export const supabaseConfigured = Boolean(env.supabase.url && env.supabase.key)
export const productionConfigured = firebaseConfigured && supabaseConfigured
