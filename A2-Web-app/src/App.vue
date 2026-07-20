<!-- App.vue — Root Layout Component
     BR (A.1): Responsive layout — Bootstrap container adapts to all screen sizes
     BR (A.2): Global Navbar with network status bar
     BR (C.4): All user-generated text rendered via {{ }} interpolation (no v-html) -->
<script setup>
import AppNavbar from './components/AppNavbar.vue'
</script>

<template>
  <div class="d-flex flex-column min-vh-100">
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
</style>
