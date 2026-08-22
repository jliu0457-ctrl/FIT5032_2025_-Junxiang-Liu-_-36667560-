<!-- App.vue — Root Layout Component
     BR (A.1): Responsive layout — Bootstrap container adapts to all screen sizes
     BR (A.2): Global Navbar with network status bar
     BR (C.4): All user-generated text rendered via {{ }} interpolation (no v-html) -->
<script setup>
import AppNavbar from './components/AppNavbar.vue'
import { firebaseConfigured } from './firebase.js'
</script>

<template>
  <div class="d-flex flex-column min-vh-100">
    <!-- Local demo mode banner (shown until Firebase is configured in .env) -->
    <div v-if="!firebaseConfigured" class="demo-banner" role="status">
      <i class="bi bi-cone-striped me-1"></i>
      Local demo mode — Firebase is not configured yet, data is stored in this browser only.
      Fill in <code>.env</code> (see README-SETUP.md, Step 1) and restart to enable Firebase Auth + Firestore.
    </div>

    <!-- Global Navigation Bar -->
    <AppNavbar />

    <!-- Main Content Area -->
    <main class="flex-grow-1">
      <router-view />
    </main>

    <!-- Footer -->
    <footer class="app-footer">
      <div class="container">
        <small>&copy; {{ new Date().getFullYear() }} Indigenous Health Connect. All rights reserved.</small>
      </div>
    </footer>
  </div>
</template>

<style scoped>
main {
  padding-top: 0;
}
.demo-banner {
  background-color: #fff3cd;
  color: #664d03;
  text-align: center;
  padding: 0.4rem 1rem;
  font-size: 0.85rem;
}
</style>
