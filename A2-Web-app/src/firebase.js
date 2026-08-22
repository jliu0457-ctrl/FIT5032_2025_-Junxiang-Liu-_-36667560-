// firebase.js — Firebase SDK Initialisation (BR D.1)
// Config values come from .env (see .env.example / README-SETUP.md).
// If Firebase is not configured yet, the app falls back to local (demo) mode
// instead of crashing — see the firebaseConfigured flag used across the app.
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// True when .env contains the minimum required Firebase config.
export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
)

let app
let auth
let db

if (firebaseConfigured) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
} else {
  console.warn(
    'Firebase is not configured — running in LOCAL DEMO MODE (data stored in this browser only). ' +
    'Copy .env.example to .env and fill in your Firebase web config to enable Firebase Auth + Firestore ' +
    '(see README-SETUP.md, Step 1). Restart `npm run dev` afterwards.'
  )
}

export { auth, db }
export default app