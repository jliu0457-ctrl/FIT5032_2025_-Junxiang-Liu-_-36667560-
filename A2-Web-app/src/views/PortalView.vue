<!-- PortalView.vue — My Health Portal (Wireframe Page 2)
     BR (B.1): Dual form validation — non-empty check + date-not-in-past check
     BR (B.2): Appointment data persisted to localStorage (ihc_bookings array)
     BR (C.4): All text rendered via {{ }} interpolation -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { state, userName } from '../stores/auth.js'

// ============================================================
// Appointment Booking Form (BR B.1)
// ============================================================

// --- Form model ---
const appointment = ref({
  date: '',
  timeSlot: '',
  practitioner: ''
})

// --- Validation errors (BR B.1) ---
const errors = ref({
  date: '',
  timeSlot: '',
  practitioner: ''
})

// --- Success message ---
const successMessage = ref('')

// --- Time slot options ---
const timeSlots = [
  '09:00 AM — 09:30 AM',
  '09:30 AM — 10:00 AM',
  '10:00 AM — 10:30 AM',
  '10:30 AM — 11:00 AM',
  '11:00 AM — 11:30 AM',
  '11:30 AM — 12:00 PM',
  '01:00 PM — 01:30 PM',
  '01:30 PM — 02:00 PM',
  '02:00 PM — 02:30 PM',
  '02:30 PM — 03:00 PM',
  '03:00 PM — 03:30 PM',
  '03:30 PM — 04:00 PM'
]

// --- Practitioner options ---
const practitioners = [
  'Dr. James Wunungmurra — General Practitioner',
  'Dr. Emily Chen — Women\'s Health',
  'Aunty Margaret — Aboriginal Health Worker',
  'Dr. Raj Patel — Chronic Disease Specialist',
  'Sarah Nguyen — Mental Health Practitioner'
]

// ============================================================
// BR (B.1): Dual Form Validation
// ============================================================

// --- Validation 1: Non-empty check ---
function validateNonEmpty() {
  let valid = true
  errors.value = { date: '', timeSlot: '', practitioner: '' }

  if (!appointment.value.date.trim()) {
    errors.value.date = 'Please select an appointment date.'
    valid = false
  }
  if (!appointment.value.timeSlot) {
    errors.value.timeSlot = 'Please select a time slot.'
    valid = false
  }
  if (!appointment.value.practitioner) {
    errors.value.practitioner = 'Please select a practitioner.'
    valid = false
  }
  return valid
}

// --- Validation 2: Date-not-in-past check (BR B.1) ---
function validateDateNotPast() {
  const selected = new Date(appointment.value.date)
  const today = new Date()
  // Reset time parts for fair date comparison
  today.setHours(0, 0, 0, 0)
  selected.setHours(0, 0, 0, 0)

  if (selected < today) {
    errors.value.date = 'Appointment date cannot be in the past. Please choose today or a future date.'
    return false
  }
  return true
}

// --- Combined validation (BR B.1) ---
function validateForm() {
  const nonEmpty = validateNonEmpty()
  const notPast = validateDateNotPast()
  return nonEmpty && notPast
}

// ============================================================
// BR (B.2): Booking persistence to LocalStorage
// ============================================================

// --- Booking history list ---
const bookings = ref([])

// --- Load existing bookings from localStorage (BR B.2) ---
function loadBookings() {
  const stored = localStorage.getItem('ihc_bookings')
  if (stored) {
    try {
      bookings.value = JSON.parse(stored)
    } catch (e) {
      bookings.value = []
    }
  }
}

// --- Submit appointment (BR B.2) ---
function submitAppointment() {
  successMessage.value = ''

  // Run dual validation (BR B.1)
  if (!validateForm()) {
    return
  }

  // Create booking record
  const newBooking = {
    id: Date.now(),
    date: appointment.value.date,
    timeSlot: appointment.value.timeSlot,
    practitioner: appointment.value.practitioner,
    bookedBy: state.currentUser?.name || 'Unknown',
    bookedByEmail: state.currentUser?.email || '',
    createdAt: new Date().toISOString()
  }

  // Save to localStorage array (BR B.2)
  bookings.value.unshift(newBooking)
  localStorage.setItem('ihc_bookings', JSON.stringify(bookings.value))

  // Show success and reset form
  successMessage.value = 'Your appointment has been booked successfully!'
  appointment.value = { date: '', timeSlot: '', practitioner: '' }
  errors.value = { date: '', timeSlot: '', practitioner: '' }

  // Auto-dismiss success message after 5s
  setTimeout(() => { successMessage.value = '' }, 5000)
}

// --- Delete a booking ---
function deleteBooking(id) {
  bookings.value = bookings.value.filter(b => b.id !== id)
  localStorage.setItem('ihc_bookings', JSON.stringify(bookings.value))
}

// --- Format date for display ---
function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-AU', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
}

// --- Today's date for date input min attribute ---
const todayStr = computed(() => new Date().toISOString().split('T')[0])

onMounted(() => {
  loadBookings()
})
</script>

<template>
  <div class="container py-4">

    <!-- Portal Header -->
    <div class="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
      <div>
        <h2 class="fw-bold mb-1" style="color: var(--ihc-primary);">
          <i class="bi bi-file-medical-fill me-2"></i>My Health Portal
        </h2>
        <p class="text-muted mb-0">Welcome back, {{ userName }}. Manage your appointments here.</p>
      </div>
      <!-- Placeholder export buttons UI (BR req for Page 2) -->
      <div class="d-flex gap-2">
        <button class="btn btn-outline-secondary btn-sm" disabled title="CSV export — coming soon">
          <i class="bi bi-file-earmark-spreadsheet"></i> Export CSV
        </button>
        <button class="btn btn-outline-secondary btn-sm" disabled title="PDF export — coming soon">
          <i class="bi bi-file-earmark-pdf"></i> Export PDF
        </button>
      </div>
    </div>

    <div class="row g-4">

      <!-- ====== Left Column: Booking Form ====== -->
      <div class="col-12 col-lg-7">
        <div class="card shadow-sm">
          <div class="card-header text-white fw-semibold" style="background-color: var(--ihc-primary);">
            <i class="bi bi-calendar-plus-fill me-2"></i>Book an Appointment
          </div>
          <div class="card-body">

            <!-- Success Alert -->
            <div v-if="successMessage" class="alert alert-success alert-dismissible fade show" role="alert">
              <i class="bi bi-check-circle-fill"></i> {{ successMessage }}
              <button type="button" class="btn-close" @click="successMessage = ''" aria-label="Close"></button>
            </div>

            <!-- Booking Form -->
            <form @submit.prevent="submitAppointment" novalidate>

              <!-- Date Input (BR B.1: validated for non-empty + not-in-past) -->
              <div class="mb-3">
                <label for="apptDate" class="form-label fw-medium">
                  <i class="bi bi-calendar3"></i> Appointment Date
                </label>
                <input
                  id="apptDate"
                  v-model="appointment.date"
                  type="date"
                  class="form-control"
                  :class="{ 'input-error': errors.date }"
                  :min="todayStr"
                />
                <!-- BR (B.1): Error messages use {{ }} interpolation (BR C.4) -->
                <div v-if="errors.date" class="validation-error">
                  <i class="bi bi-exclamation-circle-fill"></i> {{ errors.date }}
                </div>
              </div>

              <!-- Time Slot Input (BR B.1: validated for non-empty) -->
              <div class="mb-3">
                <label for="apptTime" class="form-label fw-medium">
                  <i class="bi bi-clock"></i> Time Slot
                </label>
                <select
                  id="apptTime"
                  v-model="appointment.timeSlot"
                  class="form-select"
                  :class="{ 'input-error': errors.timeSlot }"
                >
                  <option value="" disabled>— Select a time slot —</option>
                  <option v-for="slot in timeSlots" :key="slot" :value="slot">{{ slot }}</option>
                </select>
                <div v-if="errors.timeSlot" class="validation-error">
                  <i class="bi bi-exclamation-circle-fill"></i> {{ errors.timeSlot }}
                </div>
              </div>

              <!-- Practitioner Input (BR B.1: validated for non-empty) -->
              <div class="mb-4">
                <label for="apptPractitioner" class="form-label fw-medium">
                  <i class="bi bi-person-badge"></i> Practitioner
                </label>
                <select
                  id="apptPractitioner"
                  v-model="appointment.practitioner"
                  class="form-select"
                  :class="{ 'input-error': errors.practitioner }"
                >
                  <option value="" disabled>— Select a practitioner —</option>
                  <option v-for="prac in practitioners" :key="prac" :value="prac">{{ prac }}</option>
                </select>
                <div v-if="errors.practitioner" class="validation-error">
                  <i class="bi bi-exclamation-circle-fill"></i> {{ errors.practitioner }}
                </div>
              </div>

              <button type="submit" class="btn btn-lg w-100 text-white fw-semibold"
                      style="background-color: var(--ihc-primary);">
                <i class="bi bi-check-lg"></i> Confirm Booking
              </button>
            </form>
          </div>
        </div>
      </div>

      <!-- ====== Right Column: AI Assistant + Extra ====== -->
      <div class="col-12 col-lg-5">

        <!-- AI Assistant Placeholder (BR req for Page 2) -->
        <div class="card shadow-sm mb-4">
          <div class="card-header text-white fw-semibold" style="background-color: var(--ihc-accent);">
            <i class="bi bi-robot me-2"></i>AI Health Assistant
          </div>
          <div class="card-body">
            <div class="ai-chat-placeholder p-4 text-center">
              <div>
                <i class="bi bi-chat-dots-fill fs-1 mb-2 d-block" style="color: var(--ihc-text-muted);"></i>
                <p class="fw-medium mb-0">AI Chat Assistant</p>
                <p class="small text-muted mb-0">Coming soon — ask health questions and get instant guidance.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Info Card -->
        <div class="card shadow-sm">
          <div class="card-header text-white fw-semibold" style="background-color: var(--ihc-primary-light);">
            <i class="bi bi-info-circle-fill me-2"></i>Important Notice
          </div>
          <div class="card-body">
            <p class="small mb-2"><i class="bi bi-telephone-fill me-2"></i>After-hours support: <strong>1800 123 456</strong></p>
            <p class="small mb-0"><i class="bi bi-geo-alt-fill me-2"></i>Find your nearest clinic on the map (coming soon).</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ====== My Booking History (BR B.2: persisted in localStorage) ====== -->
    <div class="card shadow-sm mt-4">
      <div class="card-header text-white fw-semibold" style="background-color: var(--ihc-primary);">
        <i class="bi bi-clock-history me-2"></i>My Appointment History
        <span class="badge bg-light text-dark ms-2">{{ bookings.length }}</span>
      </div>
      <div class="card-body">
        <!-- Empty state -->
        <div v-if="bookings.length === 0" class="text-center text-muted py-4">
          <i class="bi bi-calendar-x fs-1 d-block mb-2"></i>
          <p class="mb-0">No appointments booked yet. Use the form above to schedule your first appointment.</p>
        </div>

        <!-- Booking list table (BR B.2: data persists across refreshes) -->
        <div v-else class="table-responsive">
          <table class="table table-hover align-middle">
            <thead class="table-light">
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Practitioner</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="booking in bookings" :key="booking.id">
                <td>{{ formatDate(booking.date) }}</td>
                <td>{{ booking.timeSlot }}</td>
                <td>{{ booking.practitioner }}</td>
                <td>
                  <button class="btn btn-outline-danger btn-sm" @click="deleteBooking(booking.id)"
                          title="Cancel this appointment">
                    <i class="bi bi-trash-fill"></i> Cancel
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

  </div>
</template>
