<!-- LoginView.vue — User Authentication Page
     BR (C.1): Login using LocalStorage-stored user credentials
     BR (C.4): All text rendered via {{ }} interpolation -->
<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { login } from '../stores/auth.js'

const router = useRouter()
const route = useRoute()

// --- Form fields ---
const email = ref('')
const password = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

// --- Handle login form submission (BR C.1) ---
function handleLogin() {
  errorMessage.value = ''

  // Basic client-side validation
  if (!email.value.trim() || !password.value.trim()) {
    errorMessage.value = 'Please enter both email and password.'
    return
  }

  isLoading.value = true

  // Simulate brief network delay for UX
  setTimeout(() => {
    const result = login(email.value.trim(), password.value)
    isLoading.value = false

    if (result.success) {
      // Redirect to originally requested page, or portal by default
      const redirect = route.query.redirect || '/portal'
      router.push(redirect)
    } else {
      errorMessage.value = result.message
    }
  }, 400)
}

// --- Demo credentials for quick testing ---
function fillDemoUser() {
  email.value = 'user@health.org'
  password.value = 'password123'
}
function fillDemoAdmin() {
  email.value = 'admin@health.org'
  password.value = 'admin123'
}
</script>

<template>
  <div class="container py-5">
    <div class="row justify-content-center">
      <div class="col-12 col-md-6 col-lg-5">

        <!-- Login Card -->
        <div class="card shadow-sm">
          <div class="card-body p-4">

            <!-- Header -->
            <div class="text-center mb-4">
              <i class="bi bi-heart-pulse-fill fs-1" style="color: var(--ihc-primary);"></i>
              <h2 class="mt-2 mb-1">Sign In</h2>
              <p class="text-muted">Welcome to Indigenous Health Connect</p>
            </div>

            <!-- Error Message (BR C.4: uses {{ }} interpolation) -->
            <div v-if="errorMessage" class="alert alert-danger alert-dismissible fade show" role="alert">
              <i class="bi bi-exclamation-triangle-fill"></i> {{ errorMessage }}
              <button type="button" class="btn-close" @click="errorMessage = ''" aria-label="Close"></button>
            </div>

            <!-- Login Form (BR C.1) -->
            <form @submit.prevent="handleLogin" novalidate>
              <div class="mb-3">
                <label for="loginEmail" class="form-label fw-medium">
                  <i class="bi bi-envelope-fill"></i> Email Address
                </label>
                <input
                  id="loginEmail"
                  v-model="email"
                  type="email"
                  class="form-control"
                  placeholder="Enter your email"
                  autocomplete="email"
                  required
                />
              </div>

              <div class="mb-3">
                <label for="loginPassword" class="form-label fw-medium">
                  <i class="bi bi-lock-fill"></i> Password
                </label>
                <input
                  id="loginPassword"
                  v-model="password"
                  type="password"
                  class="form-control"
                  placeholder="Enter your password"
                  autocomplete="current-password"
                  required
                />
              </div>

              <!-- Submit -->
              <button type="submit" class="btn btn-lg w-100 text-white fw-semibold"
                      style="background-color: var(--ihc-primary);"
                      :disabled="isLoading">
                <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                {{ isLoading ? 'Signing in...' : 'Sign In' }}
              </button>
            </form>

            <!-- Demo Credentials (BR C.1) — Testing shortcuts -->
            <div class="mt-4 p-3 rounded" style="background-color: #f8f9fa;">
              <p class="small fw-semibold text-muted mb-2">
                <i class="bi bi-info-circle-fill"></i> Quick Test Credentials:
              </p>
              <div class="d-flex gap-2 flex-wrap">
                <button class="btn btn-outline-secondary btn-sm" @click="fillDemoUser">
                  <i class="bi bi-person-fill"></i> Client: user@health.org
                </button>
                <button class="btn btn-outline-secondary btn-sm" @click="fillDemoAdmin">
                  <i class="bi bi-shield-fill"></i> Admin: admin@health.org
                </button>
              </div>
              <p class="small text-muted mt-2 mb-0">Password for both: <code>password123</code> / <code>admin123</code></p>
            </div>

          </div>
        </div>

      </div>
    </div>
  </div>
</template>
