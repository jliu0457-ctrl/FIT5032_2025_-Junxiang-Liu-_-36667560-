<!-- HomeView.vue — Public Home Page (Wireframe Page 1)
     BR (A.2): Welcome banner & quick links
     BR (C.3): StarRating aggregated rating component in Resource Corner
     BR (C.4): ALL text rendered via {{ }} interpolation — NO v-html used -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { state, isAdmin } from '../stores/auth.js'
import StarRating from '../components/StarRating.vue'

const router = useRouter()

// --- Mission statement ---
const missionText = ref(
  'Empowering Aboriginal and Torres Strait Islander communities through accessible, culturally-safe healthcare coordination.'
)

// --- Quick Links ---
const quickLinks = [
  { icon: 'bi-calendar-plus-fill', label: 'Book Appointment', route: '/portal', auth: true },
  { icon: 'bi-journal-medical', label: 'My Health Records', route: '/portal', auth: true },
  { icon: 'bi-people-fill', label: 'Community Resources', route: '/', auth: false },
  { icon: 'bi-telephone-fill', label: 'Crisis Support', route: '/', auth: false }
]

// --- Health Tips Carousel ---
const healthTips = ref([
  { title: 'Stay Hydrated', text: 'Drink at least 8 glasses of water daily, especially in hot weather.' },
  { title: 'Regular Check-ups', text: 'Schedule annual health screenings with your local clinic.' },
  { title: 'Mental Wellbeing', text: 'Connect with Country, family, and community for emotional health.' }
])
const currentTipIndex = ref(0)

function nextTip() {
  currentTipIndex.value = (currentTipIndex.value + 1) % healthTips.value.length
}
function prevTip() {
  currentTipIndex.value = (currentTipIndex.value - 1 + healthTips.value.length) % healthTips.value.length
}

// Auto-rotate tips every 5 seconds
onMounted(() => {
  setInterval(() => {
    nextTip()
  }, 5000)
})

// --- Resource Corner data ---
const resources = [
  { id: 'mental-health', title: 'Mental Health & Wellbeing', desc: 'Culturally appropriate mental health support services and resources.' },
  { id: 'maternal-care', title: 'Maternal & Child Health', desc: 'Antenatal and postnatal care for mothers and babies.' },
  { id: 'chronic-disease', title: 'Chronic Disease Management', desc: 'Support for diabetes, heart disease, and renal health.' },
  { id: 'telehealth', title: 'Telehealth Services', desc: 'Remote consultations connecting you with specialists.' }
]

// --- Handle quick link clicks ---
function handleQuickLink(link) {
  if (link.auth && !state.isAuthenticated) {
    router.push({ name: 'Login', query: { redirect: link.route } })
  } else {
    router.push(link.route)
  }
}
</script>

<template>
  <div>
    <!-- ====== Hero / Welcome Banner (BR A.2) ====== -->
    <section class="hero-section text-center">
      <div class="container">
        <i class="bi bi-heart-pulse-fill display-3 mb-3 d-block"></i>
        <h1 class="display-5 fw-bold mb-3">Indigenous Health Connect</h1>
        <!-- BR (C.4): Text rendered via {{ }} interpolation -->
        <p class="lead mb-4 mx-auto" style="max-width: 700px;">
          {{ missionText }}
        </p>
        <div class="d-flex gap-3 justify-content-center flex-wrap">
          <router-link to="/portal" class="btn btn-light btn-lg fw-semibold px-4">
            <i class="bi bi-calendar-plus-fill"></i> Book Appointment
          </router-link>
          <a href="#resources" class="btn btn-outline-light btn-lg px-4">
            <i class="bi bi-book-fill"></i> Explore Resources
          </a>
        </div>
      </div>
    </section>

    <div class="container">

      <!-- ====== Health Tips Carousel ====== -->
      <div class="card mb-4 border-0 shadow-sm" style="background-color: var(--ihc-accent-light);">
        <div class="card-body d-flex align-items-center justify-content-between">
          <button class="btn btn-sm btn-outline-secondary" @click="prevTip" aria-label="Previous tip">
            <i class="bi bi-chevron-left"></i>
          </button>
          <div class="text-center px-3">
            <h5 class="fw-bold mb-1" style="color: var(--ihc-primary);">
              <i class="bi bi-lightbulb-fill me-2"></i>{{ healthTips[currentTipIndex].title }}
            </h5>
            <p class="mb-0 text-muted">{{ healthTips[currentTipIndex].text }}</p>
          </div>
          <button class="btn btn-sm btn-outline-secondary" @click="nextTip" aria-label="Next tip">
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>

      <!-- ====== Quick Links Row (BR A.2) ====== -->
      <div class="row g-3 mb-5">
        <div v-for="link in quickLinks" :key="link.label" class="col-6 col-md-3">
          <button
            class="btn w-100 h-100 py-3 border-0 shadow-sm text-center"
            style="background-color: var(--ihc-surface);"
            @click="handleQuickLink(link)"
          >
            <i :class="link.icon" class="bi fs-3 d-block mb-2" style="color: var(--ihc-primary);"></i>
            <span class="small fw-medium">{{ link.label }}</span>
          </button>
        </div>
      </div>

      <!-- ====== Resource Corner with Star Ratings (BR C.3) ====== -->
      <section id="resources" class="mb-5">
        <h2 class="mb-4 fw-bold" style="color: var(--ihc-primary);">
          <i class="bi bi-collection-fill me-2"></i>Resource Corner
        </h2>
        <p class="text-muted mb-4">Rate and review our health resources to help us improve.</p>

        <div class="row g-4">
          <div v-for="resource in resources" :key="resource.id" class="col-12 col-md-6">
            <div class="card h-100">
              <div class="card-body">
                <h5 class="card-title fw-bold">{{ resource.title }}</h5>
                <p class="card-text text-muted">{{ resource.desc }}</p>
                <hr />
                <!-- BR (C.3): StarRating component with aggregated ratings -->
                <StarRating :resource-id="resource.id" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ====== News & Announcements ====== -->
      <section class="mb-5">
        <h2 class="mb-4 fw-bold" style="color: var(--ihc-primary);">
          <i class="bi bi-newspaper me-2"></i>News & Announcements
        </h2>
        <div class="row g-3">
          <div class="col-12 col-md-4">
            <div class="card h-100">
              <div class="card-body">
                <span class="badge mb-2" style="background-color: var(--ihc-primary);">New</span>
                <h6 class="fw-bold">Mobile Clinic Launch</h6>
                <p class="small text-muted">Our mobile health clinic will visit remote communities starting August 2026.</p>
              </div>
            </div>
          </div>
          <div class="col-12 col-md-4">
            <div class="card h-100">
              <div class="card-body">
                <span class="badge mb-2" style="background-color: var(--ihc-accent);">Event</span>
                <h6 class="fw-bold">Community Health Workshop</h6>
                <p class="small text-muted">Join us for a free workshop on nutrition and traditional foods, July 28.</p>
              </div>
            </div>
          </div>
          <div class="col-12 col-md-4">
            <div class="card h-100">
              <div class="card-body">
                <span class="badge bg-secondary mb-2">Update</span>
                <h6 class="fw-bold">Telehealth Expansion</h6>
                <p class="small text-muted">New telehealth units deployed to 12 additional communities this quarter.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  </div>
</template>
