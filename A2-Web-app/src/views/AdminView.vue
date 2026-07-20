<!-- AdminView.vue — Admin Dashboard (Wireframe Page 3)
     BR (B.2): Data persistence — booking stats read from localStorage
     BR (A.2): Responsive metrics cards & interactive user management table
     BR (C.4): All text rendered via {{ }} interpolation -->
<script setup>
import { ref, computed, watch, onMounted } from 'vue'

// ============================================================
// Mock User Data (BR A.2: 15-20 records with Name, Community, Role, Last Visit)
// ============================================================
const allUsers = ref([
  { id: 1,  name: 'Sarah Thompson',    community: 'Palm Island',      role: 'Client',  lastVisit: '2026-07-18' },
  { id: 2,  name: 'Dr. James Wunungmurra', community: 'Yirrkala',    role: 'Admin',   lastVisit: '2026-07-20' },
  { id: 3,  name: 'Michael Brown',      community: 'Doomadgee',       role: 'Client',  lastVisit: '2026-07-15' },
  { id: 4,  name: 'Emily Chen',         community: 'Thursday Island', role: 'Staff',   lastVisit: '2026-07-19' },
  { id: 5,  name: 'David Gulpilil',    community: 'Yirrkala',        role: 'Client',  lastVisit: '2026-07-10' },
  { id: 6,  name: 'Aunty Margaret',     community: 'Kowanyama',       role: 'Staff',   lastVisit: '2026-07-17' },
  { id: 7,  name: 'Raj Patel',          community: 'Palm Island',     role: 'Staff',   lastVisit: '2026-07-20' },
  { id: 8,  name: 'Lily Yunupingu',     community: 'Yirrkala',        role: 'Client',  lastVisit: '2026-07-14' },
  { id: 9,  name: 'Tommy George',       community: 'Aurukun',         role: 'Client',  lastVisit: '2026-07-08' },
  { id: 10, name: 'Grace Namok',        community: 'Doomadgee',       role: 'Client',  lastVisit: '2026-07-16' },
  { id: 11, name: 'Sarah Nguyen',       community: 'Thursday Island', role: 'Staff',   lastVisit: '2026-07-19' },
  { id: 12, name: 'Robert Mills',       community: 'Palm Island',     role: 'Client',  lastVisit: '2026-07-12' },
  { id: 13, name: 'Kylie O\'Shane',     community: 'Kowanyama',       role: 'Client',  lastVisit: '2026-07-18' },
  { id: 14, name: 'John Wally',         community: 'Aurukun',         role: 'Client',  lastVisit: '2026-07-05' },
  { id: 15, name: 'Dr. Karen Briggs',   community: 'Thursday Island', role: 'Staff',   lastVisit: '2026-07-20' },
  { id: 16, name: 'Peter Djarrak',      community: 'Yirrkala',        role: 'Client',  lastVisit: '2026-07-13' },
  { id: 17, name: 'Maureen Watson',     community: 'Doomadgee',       role: 'Client',  lastVisit: '2026-07-17' },
  { id: 18, name: 'Dr. Helen Reid',     community: 'Palm Island',     role: 'Admin',   lastVisit: '2026-07-20' },
  { id: 19, name: 'Andrew Namatjira',   community: 'Aurukun',         role: 'Client',  lastVisit: '2026-07-09' },
  { id: 20, name: 'Cathy Freeman-Brown', community: 'Kowanyama',      role: 'Staff',   lastVisit: '2026-07-18' }
])

// ============================================================
// Metrics (BR A.2: Stats cards with computed values)
// ============================================================
const totalRegistrations = computed(() => 1420)
const activeBookings = ref(0)

function loadBookingStats() {
  const stored = localStorage.getItem('ihc_bookings')
  if (stored) {
    try {
      activeBookings.value = JSON.parse(stored).length
    } catch (e) {
      activeBookings.value = 0
    }
  }
}

// ============================================================
// Search / Filter (BR A.2: Search by Name or Community)
// ============================================================
const searchQuery = ref('')

const filteredUsers = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return allUsers.value
  return allUsers.value.filter(u =>
    u.name.toLowerCase().includes(q) ||
    u.community.toLowerCase().includes(q) ||
    u.role.toLowerCase().includes(q)
  )
})

// ============================================================
// Column Sorting (BR A.2: Click header to sort asc/desc)
// ============================================================
const sortColumn = ref('name')
const sortDirection = ref('asc')   // 'asc' or 'desc'

function toggleSort(column) {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = 'asc'
  }
}

function sortArrow(column) {
  if (sortColumn.value !== column) return '⇅'
  return sortDirection.value === 'asc' ? '▲' : '▼'
}

const sortedUsers = computed(() => {
  const arr = [...filteredUsers.value]
  arr.sort((a, b) => {
    let valA = a[sortColumn.value]
    let valB = b[sortColumn.value]
    if (typeof valA === 'string') valA = valA.toLowerCase()
    if (typeof valB === 'string') valB = valB.toLowerCase()
    if (valA < valB) return sortDirection.value === 'asc' ? -1 : 1
    if (valA > valB) return sortDirection.value === 'asc' ? 1 : -1
    return 0
  })
  return arr
})

// ============================================================
// Pagination (BR A.2: 10 rows per page, PREV / NEXT buttons)
// ============================================================
const rowsPerPage = 10   // BR requirement: exactly 10 rows per page
const currentPage = ref(1)

const totalPages = computed(() =>
  Math.max(1, Math.ceil(sortedUsers.value.length / rowsPerPage))
)

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * rowsPerPage
  return sortedUsers.value.slice(start, start + rowsPerPage)
})

const showingFrom = computed(() =>
  sortedUsers.value.length === 0 ? 0 : (currentPage.value - 1) * rowsPerPage + 1
)
const showingTo = computed(() =>
  Math.min(currentPage.value * rowsPerPage, sortedUsers.value.length)
)

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

// Reset to first page when search query changes
watch(searchQuery, () => {
  currentPage.value = 1
})

// --- Role badge color ---
function roleBadgeClass(role) {
  switch (role) {
    case 'Admin':  return 'bg-danger'
    case 'Staff':  return 'bg-warning text-dark'
    case 'Client': return 'bg-success'
    default:       return 'bg-secondary'
  }
}

onMounted(() => {
  loadBookingStats()
})
</script>

<template>
  <div class="container py-4">

    <!-- Dashboard Header -->
    <h2 class="fw-bold mb-4" style="color: var(--ihc-primary);">
      <i class="bi bi-shield-lock-fill me-2"></i>Admin Dashboard
    </h2>

    <!-- ====== Metrics Cards (BR A.2) ====== -->
    <div class="row g-3 mb-4">
      <div class="col-12 col-sm-6 col-lg-3">
        <div class="card stats-card border-0 shadow-sm text-white" style="background-color: var(--ihc-primary);">
          <div class="card-body text-center py-3">
            <i class="bi bi-people-fill fs-1 mb-2 d-block"></i>
            <h3 class="fw-bold mb-0">{{ totalRegistrations.toLocaleString() }}</h3>
            <small>Total Registrations</small>
          </div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-lg-3">
        <div class="card stats-card border-0 shadow-sm text-white" style="background-color: var(--ihc-accent);">
          <div class="card-body text-center py-3">
            <i class="bi bi-calendar-check-fill fs-1 mb-2 d-block"></i>
            <h3 class="fw-bold mb-0">{{ activeBookings }}</h3>
            <small>Active Bookings</small>
          </div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-lg-3">
        <div class="card stats-card border-0 shadow-sm text-white" style="background-color: #6c757d;">
          <div class="card-body text-center py-3">
            <i class="bi bi-geo-alt-fill fs-1 mb-2 d-block"></i>
            <h3 class="fw-bold mb-0">{{ [...new Set(allUsers.map(u => u.community))].length }}</h3>
            <small>Communities Served</small>
          </div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-lg-3">
        <div class="card stats-card border-0 shadow-sm text-white" style="background-color: #40916c;">
          <div class="card-body text-center py-3">
            <i class="bi bi-person-badge-fill fs-1 mb-2 d-block"></i>
            <h3 class="fw-bold mb-0">{{ allUsers.filter(u => u.role === 'Staff').length }}</h3>
            <small>Health Practitioners</small>
          </div>
        </div>
      </div>
    </div>

    <!-- ====== User Management Table (BR A.2) ====== -->
    <div class="card shadow-sm">
      <div class="card-header text-white fw-semibold d-flex flex-wrap align-items-center justify-content-between gap-2"
           style="background-color: var(--ihc-primary);">
        <span><i class="bi bi-person-lines-fill me-2"></i>User Management Directory</span>
        <span class="badge bg-light text-dark">{{ filteredUsers.length }} users</span>
      </div>

      <div class="card-body">

        <!-- Search / Filter Bar (BR A.2: filter by Name or Community) -->
        <div class="row mb-3">
          <div class="col-12 col-md-6 col-lg-4">
            <div class="input-group">
              <span class="input-group-text bg-white"><i class="bi bi-search"></i></span>
              <input
                v-model="searchQuery"
                type="text"
                class="form-control"
                placeholder="Search by Name, Community, or Role..."
                aria-label="Search users"
              />
              <button
                v-if="searchQuery"
                class="btn btn-outline-secondary"
                @click="searchQuery = ''"
                title="Clear search"
              >
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
          <div class="col-12 col-md-6 col-lg-8 text-md-end mt-2 mt-md-0">
            <small class="text-muted">
              Showing {{ showingFrom }}–{{ showingTo }} of {{ filteredUsers.length }} records
            </small>
          </div>
        </div>

        <!-- Table (BR A.2: responsive, sortable, paginated) -->
        <div class="table-responsive">
          <table class="table table-hover align-middle">
            <thead class="table-light">
              <tr>
                <th>#</th>
                <!-- BR (A.2): Sortable column — Name -->
                <th class="sortable-header" @click="toggleSort('name')">
                  Name <span class="sort-arrow">{{ sortArrow('name') }}</span>
                </th>
                <!-- BR (A.2): Sortable column — Community -->
                <th class="sortable-header" @click="toggleSort('community')">
                  Community <span class="sort-arrow">{{ sortArrow('community') }}</span>
                </th>
                <!-- BR (A.2): Sortable column — Role -->
                <th class="sortable-header" @click="toggleSort('role')">
                  User Role <span class="sort-arrow">{{ sortArrow('role') }}</span>
                </th>
                <!-- BR (A.2): Sortable column — Last Visit -->
                <th class="sortable-header" @click="toggleSort('lastVisit')">
                  Last Visit <span class="sort-arrow">{{ sortArrow('lastVisit') }}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <!-- BR (A.2): Paginated rows — max 10 per page -->
              <tr v-for="user in paginatedUsers" :key="user.id">
                <td class="text-muted">{{ user.id }}</td>
                <td class="fw-medium">{{ user.name }}</td>
                <td>{{ user.community }}</td>
                <td>
                  <span class="badge" :class="roleBadgeClass(user.role)">{{ user.role }}</span>
                </td>
                <td>{{ user.lastVisit }}</td>
              </tr>
              <!-- Empty state when filter yields no results -->
              <tr v-if="paginatedUsers.length === 0">
                <td colspan="5" class="text-center text-muted py-4">
                  <i class="bi bi-search fs-3 d-block mb-2"></i>
                  No users match your search "{{ searchQuery }}".
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls (BR A.2: PREV / NEXT, 10 rows/page) -->
        <div class="pagination-wrapper mt-3">
          <small class="text-muted">
            Page {{ currentPage }} of {{ totalPages }}
            ({{ rowsPerPage }} rows per page)
          </small>
          <div class="btn-group">
            <button
              class="btn btn-outline-secondary btn-sm"
              :disabled="currentPage === 1"
              @click="goToPage(currentPage - 1)"
            >
              <i class="bi bi-chevron-left"></i> PREV
            </button>
            <button
              class="btn btn-outline-secondary btn-sm"
              :disabled="currentPage === totalPages"
              @click="goToPage(currentPage + 1)"
            >
              NEXT <i class="bi bi-chevron-right"></i>
            </button>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>
