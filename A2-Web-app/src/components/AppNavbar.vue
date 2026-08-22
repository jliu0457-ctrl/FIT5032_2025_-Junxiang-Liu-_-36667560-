<!-- AppNavbar.vue — Global Navigation Bar
     BR (A.2): Navbar with Logo, route links, and network status monitor
     BR (C.4): All text rendered via {{ }} interpolation -->
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { state, logout, isAdmin, userName } from '../stores/auth.js'

const router = useRouter()
const route = useRoute()

// --- Network status monitoring (BR A.2) ---
const isOnline = ref(navigator.onLine)

function handleOnline() { isOnline.value = true }
function handleOffline() { isOnline.value = false }

onMounted(() => {
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
})
onUnmounted(() => {
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
})

const networkLabel = computed(() => isOnline.value ? 'ONLINE' : 'OFFLINE')
const networkClass = computed(() => isOnline.value ? 'online' : 'offline')

// --- Collapse management for mobile ---
const collapseRef = ref(null)

function closeNav() {
  // Close mobile menu after navigation
  if (collapseRef.value && collapseRef.value.classList.contains('show')) {
    collapseRef.value.classList.remove('show')
  }
}

function handleLogout() {
  logout()
  router.push({ name: 'Home' })
}

// Active route check for nav-link highlighting
function isActive(name) {
  return route.name === name
}
</script>

<template>
  <!-- BR (A.2): Network Status Banner -->
  <div :class="['network-bar', networkClass]" role="status" aria-live="polite">
    <i class="bi" :class="isOnline ? 'bi-wifi' : 'bi-wifi-off'"></i>
    Network Status: {{ networkLabel }}
  </div>

  <!-- BR (A.2): Main Navigation Bar -->
  <nav class="navbar navbar-expand-lg navbar-dark sticky-top" style="background-color: var(--ihc-primary);">
    <div class="container">
      <!-- Logo / Brand -->
      <router-link class="navbar-brand d-flex align-items-center gap-2" to="/" @click="closeNav">
        <i class="bi bi-heart-pulse-fill fs-4"></i>
        <span class="fw-bold">Indigenous Health Connect</span>
      </router-link>

      <!-- Mobile Toggler -->
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#mainNavbar"
        aria-controls="mainNavbar"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <!-- Nav Links -->
      <div ref="collapseRef" class="collapse navbar-collapse" id="mainNavbar">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          <li class="nav-item">
            <router-link
              class="nav-link"
              :class="{ active: isActive('Home') }"
              :aria-current="isActive('Home') ? 'page' : undefined"
              to="/"
              @click="closeNav"
            >
              <i class="bi bi-house-door-fill"></i> Home
            </router-link>
          </li>
          <!-- Clinics map (BR E.2) — public page -->
          <li class="nav-item">
            <router-link
              class="nav-link"
              :class="{ active: isActive('Clinics') }"
              :aria-current="isActive('Clinics') ? 'page' : undefined"
              to="/clinics"
              @click="closeNav"
            >
              <i class="bi bi-geo-alt-fill"></i> Clinics
            </router-link>
          </li>
          <!-- Portal link only visible when logged in -->
          <li v-if="state.isAuthenticated" class="nav-item">
            <router-link
              class="nav-link"
              :class="{ active: isActive('Portal') }"
              :aria-current="isActive('Portal') ? 'page' : undefined"
              to="/portal"
              @click="closeNav"
            >
              <i class="bi bi-file-medical-fill"></i> My Health Portal
            </router-link>
          </li>
          <!-- Admin link only visible to Admin users -->
          <li v-if="isAdmin" class="nav-item">
            <router-link
              class="nav-link"
              :class="{ active: isActive('Admin') }"
              :aria-current="isActive('Admin') ? 'page' : undefined"
              to="/admin"
              @click="closeNav"
            >
              <i class="bi bi-shield-lock-fill"></i> Admin Dashboard
            </router-link>
          </li>
        </ul>

        <!-- Right-side: Auth controls -->
        <div class="d-flex align-items-center gap-2">
          <template v-if="state.isAuthenticated">
            <span class="text-light me-2 d-none d-lg-inline">
              <i class="bi bi-person-circle"></i> {{ userName }}
              <span class="badge bg-light text-dark ms-1">{{ state.currentUser?.role }}</span>
            </span>
            <button class="btn btn-outline-light btn-sm" @click="handleLogout">
              <i class="bi bi-box-arrow-right"></i> Logout
            </button>
          </template>
          <template v-else>
            <router-link class="btn btn-outline-light btn-sm" to="/login" @click="closeNav">
              <i class="bi bi-box-arrow-in-right"></i> Login
            </router-link>
          </template>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.navbar-brand {
  font-size: 1.1rem;
  letter-spacing: 0.3px;
}
.nav-link.active {
  font-weight: 600;
  border-bottom: 2px solid #fff;
}
@media (max-width: 991px) {
  .nav-link.active {
    border-bottom: none;
    background-color: rgba(255, 255, 255, 0.15);
    border-radius: 0.375rem;
  }
  .navbar .btn {
    margin-top: 0.5rem;
  }
}
</style>
