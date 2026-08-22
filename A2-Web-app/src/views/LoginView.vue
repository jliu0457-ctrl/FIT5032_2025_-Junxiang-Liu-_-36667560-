<!-- LoginView.vue — User Authentication Page
     BR (C.1 / D.1): Login + Register via Firebase Auth (external authentication)
     BR (B.1): Register form — non-empty, email format, min length & match validations
     BR (C.4): All text rendered via {{ }} interpolation -->
<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { login, register } from '../stores/auth.js'
import { firebaseConfigured } from '../firebase.js'

const router = useRouter()
const route = useRoute()

// --- Form fields ---
const email = ref('')
const password = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

// --- Register mode state (BR C.1) ---
const isRegistering = ref(false)
const name = ref('')
const confirmPassword = ref('')
const fieldErrors = ref({ name: '', email: '', password: '', confirmPassword: '' })

// --- Switch between Sign In / Register modes ---
function switchMode(registering) {
  isRegistering.value = registering
  errorMessage.value = ''
  fieldErrors.value = { name: '', email: '', password: '', confirmPassword: '' }
  password.value = ''
  confirmPassword.value = ''
}

// --- Handle login form submission (BR C.1 / D.1) ---
async function handleLogin() {
  errorMessage.value = ''

  // Basic client-side validation
  if (!email.value.trim() || !password.value.trim()) {
    errorMessage.value = 'Please enter both email and password.'
    return
  }

  isLoading.value = true

  const result = await login(email.value.trim(), password.value)
  isLoading.value = false

  if (result.success) {
    // Redirect to originally requested page, or portal by default
    const redirect = route.query.redirect || '/portal'
    router.push(redirect)
  } else {
    errorMessage.value = result.message
  }
}

// --- Register form validations (BR B.1: multiple validation types) ---
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateRegister() {
  let valid = true
  fieldErrors.value = { name: '', email: '', password: '', confirmPassword: '' }

  // Validation 1: Non-empty check
  if (!name.value.trim()) {
    fieldErrors.value.name = 'Please enter your full name.'
    valid = false
  }
  if (!email.value.trim()) {
    fieldErrors.value.email = 'Please enter your email address.'
    valid = false
  }
  // Validation 2: Email format check
  else if (!EMAIL_REGEX.test(email.value.trim())) {
    fieldErrors.value.email = 'Please enter a valid email address (e.g. name@example.com).'
    valid = false
  }
  if (!password.value) {
    fieldErrors.value.password = 'Please choose a password.'
    valid = false
  }
  // Validation 3: Minimum length check
  else if (password.value.length < 6) {
    fieldErrors.value.password = 'Password must be at least 6 characters long.'
    valid = false
  }
  // Validation 4: Password confirmation match
  if (!confirmPassword.value) {
    fieldErrors.value.confirmPassword = 'Please confirm your password.'
    valid = false
  } else if (confirmPassword.value !== password.value) {
    fieldErrors.value.confirmPassword = 'Passwords do not match. Please try again.'
    valid = false
  }

  return valid
}

// --- Handle register form submission (BR C.1 / D.1) ---
async function handleRegister() {
  errorMessage.value = ''

  if (!validateRegister()) {
    return
  }

  isLoading.value = true

  const result = await register(name.value, email.value.trim(), password.value)
  isLoading.value = false

  if (result.success) {
    // Auto signed-in after registration — go to portal
    router.push('/portal')
  } else {
    errorMessage.value = result.message
  }
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

        <!-- Login / Register Card -->
        <div class="card shadow-sm">
          <div class="card-body p-4">

            <!-- Header -->
            <div class="text-center mb-3">
              <i class="bi bi-heart-pulse-fill fs-1" style="color: var(--ihc-primary);"></i>
              <h2 class="mt-2 mb-1">{{ isRegistering ? 'Create Account' : 'Sign In' }}</h2>
              <p class="text-muted">{{ isRegistering ? 'Register for Indigenous Health Connect' : 'Welcome to Indigenous Health Connect' }}</p>
            </div>

            <!-- Mode Toggle (BR C.1: Login / Register) -->
            <ul class="nav nav-pills nav-justified mb-4">
              <li class="nav-item">
                <button
                  type="button"
                  class="nav-link"
                  :class="{ active: !isRegistering }"
                  @click="switchMode(false)"
                >
                  <i class="bi bi-box-arrow-in-right me-1"></i>Sign In
                </button>
              </li>
              <li class="nav-item">
                <button
                  type="button"
                  class="nav-link"
                  :class="{ active: isRegistering }"
                  @click="switchMode(true)"
                >
                  <i class="bi bi-person-plus-fill me-1"></i>Register
                </button>
              </li>
            </ul>

            <!-- Error Message (BR C.4: uses {{ }} interpolation) -->
            <div v-if="errorMessage" class="alert alert-danger alert-dismissible fade show" role="alert">
              <i class="bi bi-exclamation-triangle-fill"></i> {{ errorMessage }}
              <button type="button" class="btn-close" @click="errorMessage = ''" aria-label="Close"></button>
            </div>

            <!-- Auth Form (BR C.1) -->
            <form @submit.prevent="isRegistering ? handleRegister() : handleLogin()" novalidate>

              <!-- Full Name (Register only) -->
              <div v-if="isRegistering" class="mb-3">
                <label for="regName" class="form-label fw-medium">
                  <i class="bi bi-person-fill"></i> Full Name
                </label>
                <input
                  id="regName"
                  v-model="name"
                  type="text"
                  class="form-control"
                  :class="{ 'input-error': fieldErrors.name }"
                  placeholder="Enter your full name"
                  autocomplete="name"
                />
                <!-- BR (B.1): Inline validation error -->
                <div v-if="fieldErrors.name" class="validation-error">
                  <i class="bi bi-exclamation-circle-fill"></i> {{ fieldErrors.name }}
                </div>
              </div>

              <div class="mb-3">
                <label for="loginEmail" class="form-label fw-medium">
                  <i class="bi bi-envelope-fill"></i> Email Address
                </label>
                <input
                  id="loginEmail"
                  v-model="email"
                  type="email"
                  class="form-control"
                  :class="{ 'input-error': fieldErrors.email }"
                  placeholder="Enter your email"
                  autocomplete="email"
                  required
                />
                <!-- BR (B.1): Inline validation error -->
                <div v-if="fieldErrors.email" class="validation-error">
                  <i class="bi bi-exclamation-circle-fill"></i> {{ fieldErrors.email }}
                </div>
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
                  :class="{ 'input-error': fieldErrors.password }"
                  placeholder="Enter your password"
                  :autocomplete="isRegistering ? 'new-password' : 'current-password'"
                  required
                />
                <!-- BR (B.1): Inline validation error -->
                <div v-if="fieldErrors.password" class="validation-error">
                  <i class="bi bi-exclamation-circle-fill"></i> {{ fieldErrors.password }}
                </div>
              </div>

              <!-- Confirm Password (Register only) -->
              <div v-if="isRegistering" class="mb-3">
                <label for="regConfirmPassword" class="form-label fw-medium">
                  <i class="bi bi-lock-fill"></i> Confirm Password
                </label>
                <input
                  id="regConfirmPassword"
                  v-model="confirmPassword"
                  type="password"
                  class="form-control"
                  :class="{ 'input-error': fieldErrors.confirmPassword }"
                  placeholder="Re-enter your password"
                  autocomplete="new-password"
                />
                <!-- BR (B.1): Inline validation error -->
                <div v-if="fieldErrors.confirmPassword" class="validation-error">
                  <i class="bi bi-exclamation-circle-fill"></i> {{ fieldErrors.confirmPassword }}
                </div>
              </div>

              <!-- Submit -->
              <button type="submit" class="btn btn-lg w-100 text-white fw-semibold"
                      style="background-color: var(--ihc-primary);"
                      :disabled="isLoading">
                <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                {{ isLoading ? (isRegistering ? 'Creating account...' : 'Signing in...') : (isRegistering ? 'Create Account' : 'Sign In') }}
              </button>
            </form>

            <!-- Demo Credentials (BR C.1 / D.1) — Testing shortcuts (login mode only) -->
            <div v-if="!isRegistering" class="mt-4 p-3 rounded" style="background-color: #f8f9fa;">
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
              <!-- Firebase mode: accounts must be registered first -->
              <p v-if="firebaseConfigured" class="small text-muted mt-2 mb-0">
                Register both accounts once (password <code>password123</code>), then set
                <code>role: "Admin"</code> on admin@health.org in Firestore — see README-SETUP.md.
              </p>
              <!-- Local demo mode: pre-seeded accounts work immediately -->
              <p v-else class="small text-muted mt-2 mb-0">
                Local demo mode — passwords: <code>password123</code> (Client) / <code>admin123</code> (Admin).
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  </div>
</template>
