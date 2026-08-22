<!-- StarRating.vue — Interactive 5-Star Rating Component
     BR (C.3): Aggregated rating component for Resource Corner.
     Firebase mode: ratings stored in Firestore (one doc per user+resource:
     {resourceId}_{uid}) — each user contributes exactly one rating.
     Local demo mode (Firebase not configured): ratings kept in localStorage,
     any visitor can rate (original behaviour). -->
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore'
import { firebaseConfigured, db } from '../firebase.js'
import { state } from '../stores/auth.js'

// --- Props ---
const props = defineProps({
  resourceId: {
    type: String,
    required: true  // Unique identifier for this rating instance
  }
})

// --- Local state ---
const ratings = ref([])       // All ratings for this resource
const userRating = ref(0)     // Current user's specific rating (1-5)
const hoverStar = ref(0)      // Star being hovered
const canRate = computed(() => firebaseConfigured ? state.isAuthenticated : true)

let unsubscribe = null

// ============================================================
// Load ratings — Firestore (BR D.1) or localStorage fallback
// ============================================================
function loadLocalRatings() {
  const key = `ihc_ratings_${props.resourceId}`
  const stored = localStorage.getItem(key)
  if (stored) {
    try {
      ratings.value = JSON.parse(stored)
    } catch {
      ratings.value = []
    }
  } else {
    // Seed some default ratings so there's data to display
    ratings.value = [4, 5, 4, 3, 5, 4, 5, 4, 3, 5]
    localStorage.setItem(key, JSON.stringify(ratings.value))
  }
}

onMounted(() => {
  if (firebaseConfigured) {
    const q = query(
      collection(db, 'ratings'),
      where('resourceId', '==', props.resourceId)
    )
    unsubscribe = onSnapshot(q, snapshot => {
      ratings.value = snapshot.docs.map(d => d.data())
      // Highlight the current user's own rating (BR C.3: one vote per user)
      const mine = ratings.value.find(r => r.userId === state.currentUser?.uid)
      userRating.value = mine ? mine.stars : 0
    })
  } else {
    loadLocalRatings()
  }
})
onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})

// --- Computed: Average rating & review count (BR C.3) ---
const averageRating = computed(() => {
  if (ratings.value.length === 0) return 0
  const sum = ratings.value.reduce((acc, r) => acc + (r.stars ?? r), 0)
  return sum / ratings.value.length
})

const reviewCount = computed(() => ratings.value.length)

const averageDisplay = computed(() => averageRating.value.toFixed(1))

// --- Submit / update the user's rating (BR C.3) ---
async function submitRating(stars) {
  if (!canRate.value) return

  if (firebaseConfigured) {
    userRating.value = stars   // optimistic update; onSnapshot reconciles
    await setDoc(doc(db, 'ratings', `${props.resourceId}_${state.currentUser.uid}`), {
      resourceId: props.resourceId,
      userId: state.currentUser.uid,
      stars,
      createdAt: new Date().toISOString()
    })
    return
  }

  // Local demo mode
  userRating.value = stars
  ratings.value.push(stars)
  localStorage.setItem(`ihc_ratings_${props.resourceId}`, JSON.stringify(ratings.value))
}
</script>

<template>
  <div class="star-rating-wrapper text-center">
    <!-- Clickable stars (BR C.3) -->
    <div class="star-rating mb-2">
      <i
        v-for="star in 5"
        :key="star"
        class="bi fs-3 mx-1"
        :class="{
          'bi-star-fill': star <= (hoverStar || userRating),
          'bi-star': star > (hoverStar || userRating),
          'active': star <= (hoverStar || userRating)
        }"
        :tabindex="canRate ? 0 : -1"
        role="button"
        :aria-label="`Rate ${star} out of 5 stars`"
        :aria-disabled="canRate ? 'false' : 'true'"
        @click="submitRating(star)"
        @mouseenter="hoverStar = star"
        @mouseleave="hoverStar = 0"
      ></i>
    </div>

    <!-- Aggregated display (BR C.3) -->
    <p v-if="reviewCount > 0" class="mb-1 fw-medium">
      Community Rating: {{ averageDisplay }} out of 5
      <span class="text-muted">based on {{ reviewCount }} {{ reviewCount === 1 ? 'review' : 'reviews' }}</span>
    </p>
    <p v-else class="mb-1 fw-medium text-muted">
      No ratings yet — be the first to rate this resource!
    </p>

    <!-- Sign-in prompt for guests (Firebase mode only) -->
    <p v-if="firebaseConfigured && !state.isAuthenticated" class="small mb-1">
      <router-link to="/login"><i class="bi bi-box-arrow-in-right"></i> Sign in to rate</router-link>
    </p>

    <!-- User feedback after rating -->
    <p v-if="userRating > 0" class="text-success small">
      <i class="bi bi-check-circle-fill"></i> You rated this {{ userRating }} out of 5. Thank you!
    </p>
  </div>
</template>

<style scoped>
.star-rating-wrapper {
  padding: 1rem;
  background-color: #fefae0;
  border-radius: 0.5rem;
  border: 1px solid var(--ihc-accent-light);
}
.star-rating .bi {
  cursor: pointer;
  outline: none;
}
</style>