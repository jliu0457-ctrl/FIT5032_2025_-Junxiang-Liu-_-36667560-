<!-- ClinicsView.vue — Clinics & Services Map (BR E.2)
     Leaflet + OpenStreetMap tiles (no API key required).
     Feature 1: POI search via Nominatim (e.g. "hospital near Cairns").
     Feature 2: Route navigation via OSRM — start = geolocation or map click,
                end = a clinic; shows distance & travel time. -->
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// --- Static clinic data (Indigenous community clinics) ---
const clinics = [
  { name: 'Palm Island Health Clinic',      lat: -18.737,  lng: 146.585,  community: 'Palm Island' },
  { name: 'Yirrkala Community Clinic',      lat: -12.254,  lng: 136.894,  community: 'Yirrkala' },
  { name: 'Doomadgee Health Service',       lat: -17.936,  lng: 138.825,  community: 'Doomadgee' },
  { name: 'Thursday Island Hospital',       lat: -10.585,  lng: 142.219,  community: 'Thursday Island' },
  { name: 'Aurukun Health Centre',          lat: -13.355,  lng: 141.725,  community: 'Aurukun' },
  { name: 'Kowanyama Primary Health',       lat: -15.475,  lng: 141.746,  community: 'Kowanyama' },
  { name: 'Townsville Aboriginal Clinic',   lat: -19.265,  lng: 146.806,  community: 'Townsville' }
]

// --- Reactive state ---
const mapContainer = ref(null)
const searchQuery = ref('')
const searchStatus = ref('')
const searchResults = ref([])        // Nominatim results (list)
const routeInfo = ref(null)          // { distanceKm, durationMin } or null
const routingError = ref('')
const geolocating = ref(false)

let map = null
let markersLayer = null       // layer group for clinic markers
let searchMarkers = null      // layer group for search-result markers
let routeLayer = null         // layer group for the route polyline
let startMarker = null
let endMarker = null
let currentRouteStart = null  // { lat, lng }
let selectedClinic = null

// --- Leaflet default marker icon fix (bundlers lose the default images) ---
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href
})

onMounted(() => {
  map = L.map(mapContainer.value).setView([-19.0, 141.0], 5)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map)

  markersLayer = L.layerGroup().addTo(map)
  searchMarkers = L.layerGroup().addTo(map)
  routeLayer = L.layerGroup().addTo(map)

  // Draw all clinics
  clinics.forEach(addClinicMarker)

  // Click on the map = set route start point (E.2 feature 2)
  map.on('click', e => {
    setRouteStart({ lat: e.latlng.lat, lng: e.latlng.lng })
  })
})
onUnmounted(() => {
  if (map) { map.remove(); map = null }
})

function addClinicMarker(c) {
  const marker = L.marker([c.lat, c.lng]).addTo(markersLayer)
  marker.bindPopup(`<strong>${c.name}</strong><br>${c.community}`)
  marker.on('click', () => {
    selectedClinic = c
    if (currentRouteStart) fetchRoute(currentRouteStart, c)
  })
}

// ============================================================
// Feature 1 (BR E.2): POI search via Nominatim
// ============================================================
// Nominatim requires a descriptive User-Agent; without it requests are often
// rejected (403) — and its public API is rate-limited to ~1 req/sec, so a
// transient failure is retried once before reporting an error.
async function searchPOIs(retry = false) {
  const q = searchQuery.value.trim()
  if (!q) return
  searchStatus.value = 'Searching…'
  searchResults.value = []
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=6&q=${encodeURIComponent(q)}`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'IndigenousHealthConnect/1.0 (student assignment)' } }
    )
    if (!res.ok) {
      if (res.status === 429 || res.status === 403) {
        if (!retry) {
          // rate-limited — wait a moment and try once more
          searchStatus.value = 'Rate limited — retrying…'
          await new Promise(r => setTimeout(r, 1500))
          return searchPOIs(true)
        }
        searchStatus.value = 'Search service is busy — please wait a few seconds and try again.'
        return
      }
      throw new Error('search failed')
    }
    const data = await res.json()
    searchResults.value = data
    searchMarkers.clearLayers()
    if (data.length === 0) {
      searchStatus.value = 'No results found — try a simpler place name (e.g. "Cairns").'
      return
    }
    data.forEach((r, i) => {
      // Nominatim returns lat/lon as STRINGS (and the longitude field is "lon",
      // not "lng") — coerce to numbers before handing them to Leaflet
      const m = L.marker([Number(r.lat), Number(r.lon)]).addTo(searchMarkers)
      m.bindPopup(`<strong>${i + 1}. ${r.display_name}</strong>`)
    })
    const b = L.latLngBounds(data.map(r => [Number(r.lat), Number(r.lon)]))
    map.fitBounds(b, { padding: [30, 30], maxZoom: 12 })
    searchStatus.value = `${data.length} result${data.length > 1 ? 's' : ''} found.`
  } catch (err) {
    console.warn('[searchPOIs] error:', err)
    if (!retry) {
      searchStatus.value = 'Search failed — retrying…'
      await new Promise(r => setTimeout(r, 1500))
      return searchPOIs(true)
    }
    searchStatus.value = 'Search failed — check your network and try again.'
  }
}

// ============================================================
// Feature 2 (BR E.2): Route navigation via OSRM
// ============================================================
function setRouteStart(pos) {
  currentRouteStart = pos
  if (!startMarker) {
    startMarker = L.marker([pos.lat, pos.lng]).addTo(routeLayer)
  } else {
    startMarker.setLatLng([pos.lat, pos.lng])
  }
  if (selectedClinic) fetchRoute(pos, selectedClinic)
}

async function useMyLocation() {
  if (!navigator.geolocation) {
    routingError.value = 'Geolocation is not supported by this browser.'
    return
  }
  geolocating.value = true
  routingError.value = ''
  navigator.geolocation.getCurrentPosition(
    pos => {
      geolocating.value = false
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      setRouteStart(p)
      map.setView([p.lat, p.lng], 12)
      if (!selectedClinic) routingError.value = 'Now pick a clinic marker to get directions.'
    },
    err => {
      geolocating.value = false
      routingError.value = 'Location unavailable: ' + (err.message || 'permission denied')
    },
    { timeout: 10000 }
  )
}

async function fetchRoute(start, clinic) {
  routingError.value = ''
  routeInfo.value = null
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${clinic.lng},${clinic.lat}?overview=full&geometries=geojson`
    )
    if (!res.ok) throw new Error('route failed')
    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes?.length) throw new Error('no route')

    const route = data.routes[0]
    const coords = route.geometry.coordinates.map(c => [c[1], c[0]])
    routeLayer.clearLayers()
    L.polyline(coords, { color: '#2d6a4f', weight: 5 }).addTo(routeLayer)
    setRouteStart(start)  // re-add start marker
    if (!endMarker) {
      endMarker = L.marker([clinic.lat, clinic.lng]).addTo(routeLayer)
    } else {
      endMarker.setLatLng([clinic.lat, clinic.lng])
    }
    const bounds = L.latLngBounds([start, { lat: clinic.lat, lng: clinic.lng }])
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
    routeInfo.value = {
      distanceKm: (route.distance / 1000).toFixed(1),
      durationMin: Math.round(route.duration / 60)
    }
  } catch {
    routingError.value = 'Could not calculate the route — please try again.'
  }
}
</script>

<template>
  <div class="container py-4">
    <h2 class="fw-bold mb-4" style="color: var(--ihc-primary);">
      <i class="bi bi-geo-alt-fill me-2"></i>Clinics &amp; Services Map
    </h2>

    <div class="row g-4">
      <!-- ====== Left: Controls ====== -->
      <div class="col-12 col-lg-4">
        <!-- Feature 1: POI search -->
        <div class="card shadow-sm mb-3">
          <div class="card-header fw-semibold" style="background-color: var(--ihc-primary); color: #fff;">
            <i class="bi bi-search me-2"></i>Search Points of Interest
          </div>
          <div class="card-body">
            <div class="input-group mb-2">
              <input
                v-model="searchQuery"
                type="text"
                class="form-control"
                placeholder="e.g. Cairns, Palm Island, Cairns hospital"
                @keyup.enter="searchPOIs"
              />
              <button class="btn" style="background-color: var(--ihc-primary); color: #fff;" @click="searchPOIs">
                Search
              </button>
            </div>
            <p v-if="searchStatus" class="small text-muted mb-2">{{ searchStatus }}</p>
            <ul v-if="searchResults.length" class="list-group list-group-flush" style="max-height: 220px; overflow-y: auto;">
              <li v-for="(r, i) in searchResults" :key="i" class="list-group-item py-2 small">
                {{ i + 1 }}. {{ r.display_name }}
              </li>
            </ul>
          </div>
        </div>

        <!-- Feature 2: Route navigation -->
        <div class="card shadow-sm mb-3">
          <div class="card-header fw-semibold" style="background-color: var(--ihc-accent);">
            <i class="bi bi-sign-turn-right me-2"></i>Get Directions
          </div>
          <div class="card-body">
            <button class="btn w-100 mb-2" style="background-color: var(--ihc-primary); color: #fff;"
                    :disabled="geolocating" @click="useMyLocation">
              <span v-if="geolocating" class="spinner-border spinner-border-sm me-1" role="status"></span>
              <i class="bi bi-crosshair me-1"></i> Use My Location as Start
            </button>
            <p class="small text-muted mb-1">
              …or click anywhere on the map to set the start point, then tap a clinic marker for directions.
            </p>
            <div v-if="routeInfo" class="alert alert-success py-2 mb-0">
              <i class="bi bi-arrow-right-circle-fill me-1"></i>
              <strong>{{ routeInfo.distanceKm }} km</strong> · about
              <strong>{{ routeInfo.durationMin }} min</strong> driving
            </div>
            <div v-if="routingError" class="alert alert-danger py-2 mb-0">
              <i class="bi bi-exclamation-triangle-fill me-1"></i> {{ routingError }}
            </div>
          </div>
        </div>

        <!-- Clinic list -->
        <div class="card shadow-sm">
          <div class="card-header fw-semibold" style="background-color: var(--ihc-primary-light); color: #fff;">
            <i class="bi bi-hospital me-2"></i>Community Clinics
          </div>
          <ul class="list-group list-group-flush">
            <li v-for="c in clinics" :key="c.name" class="list-group-item d-flex justify-content-between align-items-center">
              <span>{{ c.name }} <span class="text-muted small">({{ c.community }})</span></span>
              <button class="btn btn-outline-secondary btn-sm" @click="map && map.flyTo([c.lat, c.lng], 11)">
                <i class="bi bi-geo-alt"></i>
              </button>
            </li>
          </ul>
        </div>
      </div>

      <!-- ====== Right: Map ====== -->
      <div class="col-12 col-lg-8">
        <div class="card shadow-sm">
          <div class="card-body p-0">
            <div ref="mapContainer" style="height: 600px; border-radius: 0.75rem; z-index: 0;"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Leaflet's default z-index conflicts with Bootstrap navbar; keep map below it */
</style>
