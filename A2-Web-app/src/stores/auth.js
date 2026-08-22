// stores/auth.js — Authentication State Management (BR C.1 / C.2 / D.1)
// BR (D.1): Firebase Auth (external authentication) with Firestore user profiles.
// When Firebase is not configured yet (.env missing), falls back to the original
// localStorage-based auth so the app still runs (local demo mode).
// Same export surface in both modes, so router guards, navbar and views are unaffected.
import { reactive, computed } from 'vue'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { firebaseConfigured, auth, db } from '../firebase.js'

// --- Local demo users (used only when Firebase is not configured) ---
const DEFAULT_USERS = [
  {
    email: 'user@health.org',
    password: 'password123',
    name: 'Sarah Thompson',
    role: 'Client',
    community: 'Palm Island'
  },
  {
    email: 'admin@health.org',
    password: 'admin123',
    name: 'Dr. James Wunungmurra',
    role: 'Admin',
    community: 'Yirrkala'
  }
]

// --- Reactive auth state ---
const state = reactive({
  currentUser: null,       // { uid?, email, name, role, community } or null
  isAuthenticated: false,
  authReady: false,        // true once the session has been restored
  users: []                // local-mode user list only
})

// --- Resolves when the session has been restored (used by router guard) ---
let resolveAuthReady
export const authReady = new Promise(resolve => { resolveAuthReady = resolve })

// ============================================================
// Local demo mode helpers (fallback before Firebase is configured)
// ============================================================
function loadLocalUsers() {
  const stored = localStorage.getItem('ihc_users')
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      /* corrupted storage — fall through to defaults */
    }
  }
  localStorage.setItem('ihc_users', JSON.stringify(DEFAULT_USERS))
  return [...DEFAULT_USERS]
}

function loadLocalSession() {
  const saved = localStorage.getItem('ihc_currentUser')
  if (saved) {
    try {
      state.currentUser = JSON.parse(saved)
      state.isAuthenticated = true
    } catch {
      localStorage.removeItem('ihc_currentUser')
    }
  }
}

function persistLocalSession() {
  if (state.currentUser) {
    localStorage.setItem('ihc_currentUser', JSON.stringify(state.currentUser))
  } else {
    localStorage.removeItem('ihc_currentUser')
  }
}

// ============================================================
// Firebase mode helpers
// ============================================================
async function fetchProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? snap.data() : null
}

function friendlyAuthError(error) {
  switch (error?.code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Invalid email or password. Please try again.'
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in instead.'
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.'
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.'
    default:
      return error?.message || 'Authentication failed. Please try again.'
  }
}

// ============================================================
// Session initialisation (both modes)
// ============================================================
// Resolves when the auth state listener next fires — login()/register()
// await this so state.isAuthenticated is true before the router redirects.
let notifyAuthChange = () => {}
function waitForAuthChange() {
  return new Promise(resolve => { notifyAuthChange = resolve })
}

if (firebaseConfigured) {
  // BR (D.1): Firebase Auth state listener keeps reactive state in sync
  onAuthStateChanged(auth, async firebaseUser => {
    if (firebaseUser) {
      const profile = await fetchProfile(firebaseUser.uid)
      state.currentUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: profile?.name || firebaseUser.email?.split('@')[0] || 'User',
        role: profile?.role || 'Client',
        community: profile?.community || 'Not specified'
      }
      state.isAuthenticated = true
    } else {
      state.currentUser = null
      state.isAuthenticated = false
    }
    state.authReady = true
    resolveAuthReady()
    notifyAuthChange()
  })
} else {
  // Local demo mode: restore the localStorage session synchronously
  state.users = loadLocalUsers()
  loadLocalSession()
  state.authReady = true
  resolveAuthReady()
}

// ============================================================
// Login / Register / Logout (both modes, same interface)
// ============================================================

// --- Login (BR C.1 / D.1) ---
async function login(email, password) {
  if (firebaseConfigured) {
    try {
      const wait = waitForAuthChange()
      await signInWithEmailAndPassword(auth, email.trim(), password)
      // Wait for the auth state listener so state.isAuthenticated is already
      // true when the caller redirects (avoids the guard bouncing to /login)
      await wait
      return { success: true }
    } catch (error) {
      return { success: false, message: friendlyAuthError(error) }
    }
  }

  // Local demo mode
  const user = state.users.find(
    u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
  )
  if (!user) {
    return { success: false, message: 'Invalid email or password. Please try again.' }
  }
  const { password: _, ...safeUser } = user
  state.currentUser = safeUser
  state.isAuthenticated = true
  persistLocalSession()
  return { success: true }
}

// --- Register (BR C.1 / D.1) ---
async function register(name, email, password, community = 'Not specified') {
  if (firebaseConfigured) {
    try {
      const wait = waitForAuthChange()
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password)
      const profile = {
        name: name.trim(),
        email: email.trim(),
        role: 'Client',
        community,
        createdAt: new Date().toISOString()
      }
      await setDoc(doc(db, 'users', credential.user.uid), profile)
      await wait
      // The listener may have fired before the profile doc existed — make sure
      // the reactive state carries the real name/role/community
      if (state.currentUser) {
        state.currentUser.name = profile.name
        state.currentUser.role = profile.role
        state.currentUser.community = profile.community
      }
      return { success: true }
    } catch (error) {
      return { success: false, message: friendlyAuthError(error) }
    }
  }

  // Local demo mode
  const normalized = email.trim().toLowerCase()
  if (state.users.some(u => u.email.toLowerCase() === normalized)) {
    return { success: false, message: 'An account with this email already exists. Please sign in instead.' }
  }
  const newUser = {
    email: email.trim(),
    password,
    name: name.trim(),
    role: 'Client',
    community
  }
  state.users.push(newUser)
  localStorage.setItem('ihc_users', JSON.stringify(state.users))
  const { password: _, ...safeUser } = newUser
  state.currentUser = safeUser
  state.isAuthenticated = true
  persistLocalSession()
  return { success: true }
}

// --- Logout ---
async function logout() {
  if (firebaseConfigured) {
    await signOut(auth)
    // state is cleared by the onAuthStateChanged listener
  } else {
    state.currentUser = null
    state.isAuthenticated = false
    persistLocalSession()
  }
}

// --- Kept for router compatibility: session restore is handled at module init ---
function loadSession() { /* no-op */ }

// --- Computed helpers ---
const isAdmin = computed(() => state.currentUser?.role === 'Admin')
const isClient = computed(() => state.currentUser?.role === 'Client')
const userName = computed(() => state.currentUser?.name || 'Guest')

// --- Check if user can access a route (BR C.2) ---
function canAccess(requiredRole) {
  if (!state.isAuthenticated) return false
  if (!requiredRole) return true
  if (requiredRole === 'Admin') return state.currentUser?.role === 'Admin'
  return true
}

// Export (same surface in both modes)
export { state, login, register, logout, loadSession, isAdmin, isClient, userName, canAccess }