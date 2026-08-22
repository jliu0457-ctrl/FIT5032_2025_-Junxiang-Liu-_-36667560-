// router/index.js — Vue Router Configuration with Navigation Guards
// BR (C.1): Redirect unauthenticated users to /login
// BR (C.2): Role-based access — non-Admin users blocked from /admin
// BR (D.1): Guard waits for Firebase session restore (authReady) before checking

import { createRouter, createWebHistory } from 'vue-router'
import { state, authReady } from '../stores/auth.js'

// Lazy-loaded view components for code-splitting
const HomeView = () => import('../views/HomeView.vue')
const LoginView = () => import('../views/LoginView.vue')
const PortalView = () => import('../views/PortalView.vue')
const AdminView = () => import('../views/AdminView.vue')
const ClinicsView = () => import('../views/ClinicsView.vue')

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomeView,
    meta: { requiresAuth: false, title: 'Home — Indigenous Health Connect' }
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { requiresAuth: false, title: 'Login — Indigenous Health Connect' }
  },
  {
    path: '/portal',
    name: 'Portal',
    component: PortalView,
    meta: { requiresAuth: true, title: 'My Health Portal — Indigenous Health Connect' }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: AdminView,
    meta: { requiresAuth: true, requiredRole: 'Admin', title: 'Admin Dashboard — Indigenous Health Connect' }
  },
  {
    path: '/clinics',
    name: 'Clinics',
    component: ClinicsView,
    meta: { requiresAuth: false, title: 'Clinics & Services Map — Indigenous Health Connect' }
  },
  // Catch-all redirect to home
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    // Always scroll to top on navigation
    return { top: 0 }
  }
})

// --- Global Navigation Guard (BR C.1, C.2 & D.1) ---
router.beforeEach(async (to, from, next) => {
  // BR (D.1): wait for Firebase to restore the persisted session
  await authReady

  // Update document title
  document.title = to.meta.title || 'Indigenous Health Connect'

  const isAuthenticated = state.isAuthenticated
  const userRole = state.currentUser?.role
  const requiresAuth = to.meta.requiresAuth
  const requiredRole = to.meta.requiredRole

  // BR (C.1): Unauthenticated users redirected to /login
  if (requiresAuth && !isAuthenticated) {
    return next({ name: 'Login', query: { redirect: to.fullPath } })
  }

  // BR (C.2): Non-Admin users blocked from /admin
  if (requiredRole && requiredRole === 'Admin' && userRole !== 'Admin') {
    alert('Access Denied: You do not have administrator privileges.')
    return next({ name: 'Home' })
  }

  next()
})

export default router
