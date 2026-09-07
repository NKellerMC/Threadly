const DEFAULT_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAESHaIzOq2c9LgXh_x3HaPs4Zg3qQL3LM',
  authDomain: 'threadly-61b09.firebaseapp.com',
  projectId: 'threadly-61b09',
  storageBucket: 'threadly-61b09.firebasestorage.app',
  messagingSenderId: '841759425713',
  appId: '1:841759425713:web:0238f31b10a6466823ce90',
}

const DEFAULT_SUPABASE_URL = 'https://qfuwowgbxaxswypjdrzu.supabase.co'
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_QoJh_wIuRG4X4GAhw9wDAg_m-s46G0a'

export const env = {
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || DEFAULT_FIREBASE_CONFIG.apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || DEFAULT_FIREBASE_CONFIG.authDomain,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_CONFIG.projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || DEFAULT_FIREBASE_CONFIG.storageBucket,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
    appId: import.meta.env.VITE_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId,
  },
  firebaseFunctionsRegion: import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1',
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
