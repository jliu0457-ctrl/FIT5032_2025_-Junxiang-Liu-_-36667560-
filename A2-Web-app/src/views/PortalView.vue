<!-- PortalView.vue — My Health Portal
     BR (F.1-1): Calendar Booking — FullCalendar.io with conflict management.
     BR (E.1): Bookings are validated & created by the AWS Lambda function
               (custom business rules: clinic hours, 30-min slots, overlap detection).
     BR (D.1): Booking data lives in Firestore (live via onSnapshot).
     BR (C.4): All text rendered via {{ }} interpolation -->
<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Modal } from 'bootstrap'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
// FullCalendar styles vendored locally (v6.1.21 npm packages don't ship CSS;
// the source files are SCSS, so they are compiled by Vite via sass)
import '../assets/fc/packages/core/src/index.scss'
import '../assets/fc/packages/daygrid/src/index.scss'
import '../assets/fc/packages/timegrid/src/index.scss'
import { collection, onSnapshot } from 'firebase/firestore'
import { firebaseConfigured, auth, db } from '../firebase.js'
import { state, userName } from '../stores/auth.js'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// --- Lambda API base URL (AWS Function URL, see README-SETUP.md) ---
const LAMBDA_URL = import.meta.env.VITE_LAMBDA_URL || ''

// --- Build a .ics calendar file for a booking (BR D.2: email attachment) ---
function buildICS({ date, startTime, endTime, practitioner }) {
  const fmt = (dt) => `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, '0')}${String(dt.getDate()).padStart(2, '0')}`
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const start = new Date(`${date}T00:00:00`)
  const end = new Date(start)
  start.setHours(sh, sm); end.setHours(eh, em)
  const uid = `booking-${date}-${startTime}-${Date.now()}@ihc`
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Indigenous Health Connect//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${fmt(start)}T${startTime.replace(':', '')}00`,
    `DTEND:${fmt(end)}T${endTime.replace(':', '')}00`,
    `SUMMARY:${practitioner}`,
    'DESCRIPTION:Appointment with Indigenous Health Connect',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')
  return ics
}

// --- Send the booking-confirmation email via the Lambda /email route (BR D.2) ---
async function sendConfirmationEmail(booking, ics) {
  if (!LAMBDA_URL) return
  try {
    const idToken = await auth.currentUser.getIdToken()
    const res = await fetch(`${LAMBDA_URL}/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({
        to: auth.currentUser.email,
        subject: 'Appointment Confirmed — Indigenous Health Connect',
        text: `Hi ${userName.value},\n\nYour appointment is confirmed:\n  Date: ${booking.date}\n  Time: ${booking.startTime} – ${booking.endTime}\n  Practitioner: ${booking.practitioner}\n\nA calendar invite (.ics) is attached — add it to your calendar.\n\nIndigenous Health Connect`,
        attachment: {
          filename: `appointment-${booking.date}.ics`,
          contentBase64: btoa(unescape(encodeURIComponent(ics)))
        }
      })
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      console.warn('Confirmation email not sent:', data?.message || res.status)
    }
  } catch (e) {
    console.warn('Confirmation email not sent:', e.message)
  }
}

// --- Practitioner options (BR F.1-1) ---
const practitioners = [
  'Dr. James Wunungmurra — General Practitioner',
  'Dr. Emily Chen — Women\'s Health',
  'Aunty Margaret — Aboriginal Health Worker',
  'Dr. Raj Patel — Chronic Disease Specialist',
  'Sarah Nguyen — Mental Health Practitioner'
]

// --- Color per practitioner (calendar events + legend) ---
const practitionerColors = ['#2d6a4f', '#7b2cbf', '#d4a373', '#1d3557', '#e07a5f']
function colorFor(p) {
  return practitionerColors[practitioners.indexOf(p) % practitionerColors.length]
}

// ============================================================
// BR (D.1): Bookings live from Firestore (localStorage fallback
// until Firebase is configured — local demo mode)
// ============================================================
const bookings = ref([])
let unsubscribeBookings = null

function loadLocalBookings() {
  const stored = localStorage.getItem('ihc_bookings')
  if (stored) {
    try {
      bookings.value = JSON.parse(stored)
    } catch {
      bookings.value = []
    }
  }
}

onMounted(() => {
  if (firebaseConfigured) {
    unsubscribeBookings = onSnapshot(collection(db, 'bookings'), snapshot => {
      bookings.value = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    })
  } else {
    loadLocalBookings()
  }
})
onUnmounted(() => {
  if (unsubscribeBookings) unsubscribeBookings()
})

// --- Map Firestore bookings to FullCalendar events ---
const calendarEvents = computed(() =>
  bookings.value.map(b => ({
    id: b.id,
    title: b.practitioner,
    start: `${b.date}T${b.startTime}:00`,
    end: `${b.date}T${b.endTime}:00`,
    backgroundColor: colorFor(b.practitioner),
    borderColor: colorFor(b.practitioner)
  }))
)

// ============================================================
// BR (F.1-1): Slot selection + booking modal
// ============================================================
const selectedRange = ref(null)      // { date, startTime, endTime }
const selectedPractitioner = ref('')
const bookingError = ref('')
const bookingBusy = ref(false)
const successMessage = ref('')

// BR (F.1-4): persist the booking draft to localStorage — survives offline /
// accidental refresh; restored when the modal opens (offline feature #2).
const DRAFT_KEY = 'ihc_booking_draft'
function saveDraft() {
  if (selectedRange.value) {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      range: selectedRange.value,
      practitioner: selectedPractitioner.value
    }))
  } else {
    localStorage.removeItem(DRAFT_KEY)
  }
}
function restoreDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return
    const { range, practitioner } = JSON.parse(raw)
    if (range && range.date && range.startTime) {
      selectedRange.value = range
      selectedPractitioner.value = practitioner || practitioners[0]
    }
  } catch { /* ignore corrupted draft */ }
}
watch([selectedRange, selectedPractitioner], saveDraft)

const modalEl = ref(null)
let modalInstance = null

onMounted(() => {
  if (modalEl.value) modalInstance = new Modal(modalEl.value)
})

function pad(n) {
  return String(n).padStart(2, '0')
}

// FullCalendar select callback — user clicked/dragged an empty slot
function handleSelect(selectInfo) {
  const { start, end } = selectInfo
  selectedRange.value = {
    date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
    endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}`
  }
  selectedPractitioner.value = practitioners[0]
  bookingError.value = ''
  if (modalInstance) modalInstance.show()
  selectInfo.view.calendar.unselect() // clear the selection highlight
}

// (BR F.1-4) Restore a persisted booking draft on mount
onMounted(() => restoreDraft())

// Booking is only allowed in the time-grid views (week/day).
// NOTE: FullCalendar may pass an info object whose `view` is not yet set
// (e.g. at drag-start) — treat that as allowed instead of crashing.
function selectAllow(info) {
  return !info.view || info.view.type !== 'dayGridMonth'
}

// --- Submit booking: Lambda function (BR E.1) or local demo mode ---
async function confirmBooking() {
  bookingBusy.value = true
  bookingError.value = ''
  try {
    // Local demo mode: lightweight client-side conflict check
    if (!firebaseConfigured) {
      const r = selectedRange.value
      const conflict = bookings.value.find(b =>
        b.practitioner === selectedPractitioner.value &&
        b.date === r.date && b.startTime < r.endTime && r.startTime < b.endTime
      )
      if (conflict) {
        bookingError.value = `This practitioner already has a booking from ${conflict.startTime} to ${conflict.endTime} on ${r.date}.`
        return
      }
      bookings.value.unshift({
        id: Date.now(),
        date: r.date,
        startTime: r.startTime,
        endTime: r.endTime,
        practitioner: selectedPractitioner.value
      })
      localStorage.setItem('ihc_bookings', JSON.stringify(bookings.value))
      if (modalInstance) modalInstance.hide()
      successMessage.value = 'Your appointment has been booked successfully!'
      setTimeout(() => { successMessage.value = '' }, 5000)
      // BR (F.1-4): clear the saved draft — this booking is done
      localStorage.removeItem(DRAFT_KEY)
      // BR (D.2): send a confirmation email with a .ics attachment (best effort)
      const booking = { date: r.date, startTime: r.startTime, endTime: r.endTime, practitioner: selectedPractitioner.value }
      sendConfirmationEmail(booking, buildICS(booking))
      return
    }

    if (!LAMBDA_URL) {
      bookingError.value = 'Booking service URL is not configured (set VITE_LAMBDA_URL). See README-SETUP.md.'
      return
    }
    // Firebase ID token proves identity to the Lambda function (BR C.4)
    const idToken = await auth.currentUser.getIdToken()
    const res = await fetch(`${LAMBDA_URL}/booking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({ ...selectedRange.value, practitioner: selectedPractitioner.value })
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      bookingError.value = data.message || 'Booking failed. Please try again.'
      return
    }
    if (modalInstance) modalInstance.hide()
    successMessage.value = 'Your appointment has been booked successfully!'
    setTimeout(() => { successMessage.value = '' }, 5000)
    // BR (F.1-4): clear the saved draft — this booking is done
    localStorage.removeItem(DRAFT_KEY)
    // BR (D.2): send a confirmation email with a .ics attachment (best effort)
    const booking = { date: selectedRange.value.date, startTime: selectedRange.value.startTime, endTime: selectedRange.value.endTime, practitioner: selectedPractitioner.value }
    sendConfirmationEmail(booking, buildICS(booking))
  } catch {
    bookingError.value = 'Network error: unable to reach the booking service. Please try again.'
  } finally {
    bookingBusy.value = false
  }
}

// --- Cancel a booking: Lambda function (BR E.1) or local demo mode ---
async function cancelBooking(id) {
  if (!window.confirm('Cancel this appointment?')) return

  // Local demo mode
  if (!firebaseConfigured) {
    bookings.value = bookings.value.filter(b => b.id !== id)
    localStorage.setItem('ihc_bookings', JSON.stringify(bookings.value))
    return
  }

  try {
    const idToken = await auth.currentUser.getIdToken()
    const res = await fetch(`${LAMBDA_URL}/booking/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${idToken}` }
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      alert(data.message || 'Cancel failed. Please try again.')
    }
  } catch {
    alert('Network error: unable to cancel the booking.')
  }
}

// --- Format date for display ---
function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-AU', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
}

// ============================================================
// BR (D.3): Interactive table #2 — My Appointment History
// (sorting + single-column search + 10 rows per page)
// ============================================================
const historySortColumn = ref('date')
const historySortDir = ref('desc')
const historySearchQuery = ref('')
const historySearchColumn = ref('practitioner')
const historyPage = ref(1)
const ROWS_PER_PAGE = 10

// The rows available to the history table (this user's bookings)
const historyRows = computed(() =>
  firebaseConfigured
    ? bookings.value.filter(b => b.bookedByUid === state.currentUser?.uid)
    : bookings.value
)

// Single-column search filter
const historyFiltered = computed(() => {
  const q = historySearchQuery.value.toLowerCase().trim()
  if (!q) return historyRows.value
  return historyRows.value.filter(b =>
    String(b[historySearchColumn.value] ?? '').toLowerCase().includes(q)
  )
})

// Sorting (date sorts as real dates, others as strings)
const historySorted = computed(() => {
  const arr = [...historyFiltered.value]
  const col = historySortColumn.value
  const dir = historySortDir.value === 'asc' ? 1 : -1
  arr.sort((a, b) => {
    if (col === 'date') {
      return (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) * dir
    }
    const va = String(a[col] ?? '').toLowerCase()
    const vb = String(b[col] ?? '').toLowerCase()
    return (va < vb ? -1 : va > vb ? 1 : 0) * dir
  })
  return arr
})

const historyTotalPages = computed(() =>
  Math.max(1, Math.ceil(historySorted.value.length / ROWS_PER_PAGE))
)
const historyPaginated = computed(() => {
  const start = (historyPage.value - 1) * ROWS_PER_PAGE
  return historySorted.value.slice(start, start + ROWS_PER_PAGE)
})
const historyShowingFrom = computed(() =>
  historySorted.value.length === 0 ? 0 : (historyPage.value - 1) * ROWS_PER_PAGE + 1
)
const historyShowingTo = computed(() =>
  Math.min(historyPage.value * ROWS_PER_PAGE, historySorted.value.length)
)

function toggleHistorySort(column) {
  if (historySortColumn.value === column) {
    historySortDir.value = historySortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    historySortColumn.value = column
    historySortDir.value = 'asc'
  }
}

// BR (E.3): keyboard-triggerable sort (Enter/Space on a focused header)
function onHistorySortKeydown(column, e) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    toggleHistorySort(column)
  }
}
function historySortArrow(column) {
  if (historySortColumn.value !== column) return ''
  return historySortDir.value === 'asc' ? '▲' : '▼'
}

// Reset to page 1 when search changes
watch([historySearchQuery, historySearchColumn], () => { historyPage.value = 1 })

// ============================================================
// BR (E.4): Data export — CSV & PDF of the current user's bookings
// ============================================================
function myBookings() {
  if (!firebaseConfigured) return bookings.value
  // In Firebase mode, only export this user's own bookings
  const uid = state?.currentUser?.uid
  return bookings.value.filter(b => !uid || b.bookedByUid === uid)
}

function exportBookingsCSV() {
  const rows = myBookings()
  const header = ['Date', 'Start', 'End', 'Practitioner']
  const lines = [header.join(',')]
  for (const b of rows) {
    lines.push([b.date, b.startTime, b.endTime, `"${b.practitioner}"`].join(','))
  }
  // UTF-8 BOM (﻿) so Excel opens the Chinese text correctly (no garbled characters)
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'my-appointments.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function exportBookingsPDF() {
  const rows = myBookings()
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text('My Appointments — Indigenous Health Connect', 14, 16)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Exported ${new Date().toLocaleDateString('en-AU')}`, 14, 23)
  autoTable(doc, {
    startY: 28,
    head: [['Date', 'Start', 'End', 'Practitioner']],
    body: rows.map(b => [b.date, b.startTime, b.endTime, b.practitioner])
  })
  doc.save('my-appointments.pdf')
}

// --- FullCalendar options (BR F.1-1) ---
const calendarOptions = {
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: 'timeGridWeek',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay'
  },
  slotMinTime: '09:00:00',   // clinic hours (matches Lambda business rules)
  slotMaxTime: '16:00:00',
  slotDuration: '00:30:00',
  allDaySlot: false,
  selectable: true,
  selectMirror: true,
  selectAllow,
  select: handleSelect,
  nowIndicator: true,
  // NOTE: fixed height is required — with height:'auto' the time-grid
  // views (week/day) collapse to zero height and no slots are clickable
  height: 650,
  events: calendarEvents
}
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
      <!-- Export buttons (BR E.4) -->
      <div class="d-flex gap-2">
        <button class="btn btn-outline-secondary btn-sm" @click="exportBookingsCSV"
                title="Export your bookings as CSV">
          <i class="bi bi-file-earmark-spreadsheet"></i> Export CSV
        </button>
        <button class="btn btn-outline-secondary btn-sm" @click="exportBookingsPDF"
                title="Export your bookings as PDF">
          <i class="bi bi-file-earmark-pdf"></i> Export PDF
        </button>
      </div>
    </div>

    <div class="row g-4">

      <!-- ====== Left Column: Booking Calendar (BR F.1-1) ====== -->
      <div class="col-12 col-lg-7">
        <div class="card shadow-sm">
          <div class="card-header text-white fw-semibold" style="background-color: var(--ihc-primary);">
            <i class="bi bi-calendar-plus-fill me-2"></i>Book an Appointment
          </div>
          <div class="card-body">

            <!-- Success Alert -->
            <div v-if="successMessage" class="alert alert-success alert-dismissible fade show" role="status" aria-live="polite">
              <i class="bi bi-check-circle-fill" aria-hidden="true"></i> {{ successMessage }}
              <button type="button" class="btn-close" @click="successMessage = ''" aria-label="Close"></button>
            </div>

            <p class="small text-muted mb-3">
              <i class="bi bi-info-circle-fill me-1"></i>
              Click or drag an empty slot in the week/day view to book.
              Clinic hours are 9:00 AM – 4:00 PM, 30-minute slots.
            </p>

            <!-- FullCalendar (BR F.1-1) -->
            <FullCalendar :options="calendarOptions" />

            <!-- Practitioner colour legend -->
            <div class="d-flex flex-wrap gap-3 mt-3">
              <span v-for="p in practitioners" :key="p" class="small d-inline-flex align-items-center gap-1">
                <span class="legend-dot" :style="{ backgroundColor: colorFor(p) }" aria-hidden="true"></span>
                {{ p }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- ====== Right Column: AI Assistant + Extra ====== -->
      <div class="col-12 col-lg-5">

        <!-- AI Assistant Placeholder (GenAI comes in a later phase) -->
        <div class="card shadow-sm mb-4">
          <div class="card-header fw-semibold" style="background-color: var(--ihc-accent); color: var(--ihc-text);">
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

    <!-- ====== My Booking History (BR D.1: live from Firestore) ====== -->
    <div class="card shadow-sm mt-4">
      <div class="card-header text-white fw-semibold" style="background-color: var(--ihc-primary);">
        <i class="bi bi-clock-history me-2"></i>My Appointment History
        <span class="badge bg-light text-dark ms-2">{{ bookings.length }}</span>
      </div>
      <div class="card-body">
        <!-- Empty state -->
        <div v-if="bookings.length === 0" class="text-center text-muted py-4">
          <i class="bi bi-calendar-x fs-1 d-block mb-2"></i>
          <p class="mb-0">No appointments booked yet. Use the calendar above to schedule your first appointment.</p>
        </div>

        <!-- BR (D.3): Interactive table — sortable, single-column search, 10/page -->
        <div v-else>
          <!-- Search bar (single column) -->
          <div class="input-group mb-3" style="max-width: 420px;">
            <select v-model="historySearchColumn" class="form-select" style="max-width: 9rem;" aria-label="Search column">
              <option value="practitioner">Practitioner</option>
              <option value="date">Date</option>
              <option value="startTime">Start</option>
              <option value="endTime">End</option>
            </select>
            <span class="input-group-text bg-white"><i class="bi bi-search"></i></span>
            <input
              v-model="historySearchQuery"
              type="text"
              class="form-control"
              :placeholder="`Search by ${historySearchColumn}...`"
              aria-label="Search bookings"
            />
          </div>

          <div class="table-responsive">
            <table class="table table-hover align-middle">
              <thead class="table-light">
                <tr>
                  <th class="sortable-header" tabindex="0" role="button"
                      @click="toggleHistorySort('date')" @keydown="onHistorySortKeydown('date', $event)">
                    Date <span class="sort-arrow" aria-hidden="true">{{ historySortArrow('date') }}</span>
                  </th>
                  <th class="sortable-header" tabindex="0" role="button"
                      @click="toggleHistorySort('startTime')" @keydown="onHistorySortKeydown('startTime', $event)">
                    Time <span class="sort-arrow" aria-hidden="true">{{ historySortArrow('startTime') }}</span>
                  </th>
                  <th class="sortable-header" tabindex="0" role="button"
                      @click="toggleHistorySort('practitioner')" @keydown="onHistorySortKeydown('practitioner', $event)">
                    Practitioner <span class="sort-arrow" aria-hidden="true">{{ historySortArrow('practitioner') }}</span>
                  </th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="booking in historyPaginated" :key="booking.id">
                  <td>{{ formatDate(booking.date) }}</td>
                  <td>{{ booking.startTime }} – {{ booking.endTime }}</td>
                  <td>{{ booking.practitioner }}</td>
                  <td>
                    <button class="btn btn-outline-danger btn-sm" @click="cancelBooking(booking.id)"
                            title="Cancel this appointment">
                      <i class="bi bi-trash-fill"></i> Cancel
                    </button>
                  </td>
                </tr>
                <tr v-if="historyPaginated.length === 0">
                  <td colspan="4" class="text-center text-muted py-4">
                    No bookings match your search.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination (10 rows per page) -->
          <div class="pagination-wrapper mt-3">
            <small class="text-muted">
              Showing {{ historyShowingFrom }}–{{ historyShowingTo }} of {{ historyFiltered.length }} records
              · Page {{ historyPage }} of {{ historyTotalPages }} ({{ ROWS_PER_PAGE }} rows/page)
            </small>
            <div class="btn-group">
              <button class="btn btn-outline-secondary btn-sm" :disabled="historyPage === 1"
                      @click="historyPage--">
                <i class="bi bi-chevron-left"></i> PREV
              </button>
              <button class="btn btn-outline-secondary btn-sm" :disabled="historyPage === historyTotalPages"
                      @click="historyPage++">
                NEXT <i class="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ====== Booking Confirmation Modal (BR F.1-1) ====== -->
    <div class="modal fade" ref="modalEl" tabindex="-1" aria-labelledby="bookingModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="bookingModalLabel">
              <i class="bi bi-calendar-check me-2"></i>Confirm Appointment
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p class="mb-3" v-if="selectedRange">
              <i class="bi bi-clock me-1"></i>
              {{ formatDate(selectedRange.date) }},
              {{ selectedRange.startTime }} – {{ selectedRange.endTime }}
            </p>
            <div class="mb-3">
              <label for="modalPractitioner" class="form-label fw-medium">
                <i class="bi bi-person-badge"></i> Practitioner
              </label>
              <select id="modalPractitioner" v-model="selectedPractitioner" class="form-select">
                <option v-for="prac in practitioners" :key="prac" :value="prac">{{ prac }}</option>
              </select>
            </div>
            <!-- Conflict / validation errors from the Lambda function (BR E.1) -->
            <div v-if="bookingError" class="alert alert-danger" role="alert" aria-live="assertive">
              <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i> {{ bookingError }}
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn text-white fw-semibold"
                    style="background-color: var(--ihc-primary);"
                    :disabled="bookingBusy"
                    @click="confirmBooking">
              <span v-if="bookingBusy" class="spinner-border spinner-border-sm me-2" role="status"></span>
              {{ bookingBusy ? 'Booking...' : 'Confirm Booking' }}
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.legend-dot {
  display: inline-block;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
}

/* FullCalendar timegrid fix: force every 30-min slot row to the same height.
   Otherwise the table's height:100% pushes all leftover vertical space into
   the LAST row (the 15:30–16:00 slot), which stretches it into a huge
   unclickable blank area. */
:deep(.fc .fc-timegrid-slots > table) {
  height: auto;
}
:deep(.fc .fc-timegrid-slots tr) {
  height: 2.75em;
}
</style>