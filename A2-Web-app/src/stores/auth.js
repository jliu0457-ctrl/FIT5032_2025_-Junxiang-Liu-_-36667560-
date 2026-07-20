// stores/auth.js — Reactive Authentication State Management
// BR (C.1): LocalStorage-based auth with role-based access control
// BR (C.2): Navigation Guards integration (used by router)

import { reactive, computed } from 'vue'

// --- Default user database (BR C.1) ---
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
  currentUser: null,       // { email, name, role, community } or null
  isAuthenticated: false,
  users: [...DEFAULT_USERS]
})

// --- Load persisted session from LocalStorage on app start ---
function loadSession() {
  const saved = localStorage.getItem('ihc_currentUser')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      state.currentUser = parsed
      state.isAuthenticated = true
    } catch (e) {
      console.error('Session load failed:', e)
      localStorage.removeItem('ihc_currentUser')
    }
  }
  // Also ensure default users exist in localStorage
  const storedUsers = localStorage.getItem('ihc_users')
  if (!storedUsers) {
    localStorage.setItem('ihc_users', JSON.stringify(DEFAULT_USERS))
  } else {
    state.users = JSON.parse(storedUsers)
  }
}

// --- Persist session ---
function persistSession() {
  if (state.currentUser) {
    localStorage.setItem('ihc_currentUser', JSON.stringify(state.currentUser))
  } else {
    localStorage.removeItem('ihc_currentUser')
  }
}

// --- Login function (BR C.1) ---
function login(email, password) {
  const user = state.users.find(
    u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  )
  if (!user) {
    return { success: false, message: 'Invalid email or password. Please try again.' }
  }
  // Store session (exclude password)
  const { password: _, ...safeUser } = user
  state.currentUser = safeUser
  state.isAuthenticated = true
  persistSession()
  return { success: true, user: safeUser }
}

// --- Logout function ---
function logout() {
  state.currentUser = null
  state.isAuthenticated = false
  persistSession()
}

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

// Export
export { state, login, logout, loadSession, isAdmin, isClient, userName, canAccess }
