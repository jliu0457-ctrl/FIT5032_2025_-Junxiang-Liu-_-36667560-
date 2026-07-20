<!-- StarRating.vue — Interactive 5-Star Rating Component
     BR (C.3): Aggregated rating component for Resource Corner
     Users click 1-5 stars; rating data persisted to LocalStorage.
     Displays community average and total review count. -->
<script setup>
import { ref, computed, onMounted } from 'vue'

// --- Props ---
const props = defineProps({
  resourceId: {
    type: String,
    required: true  // Unique identifier for this rating instance
  }
})

// --- Local state ---
const userRating = ref(0)       // Current user's specific rating (1-5)
const hoverStar = ref(0)        // Star being hovered
const allRatings = ref([])      // All ratings from all users (from localStorage)

// --- Load persisted ratings from LocalStorage (BR C.3) ---
function loadRatings() {
  const key = `ihc_ratings_${props.resourceId}`
  const stored = localStorage.getItem(key)
  if (stored) {
    try {
      allRatings.value = JSON.parse(stored)
    } catch (e) {
      allRatings.value = []
    }
  } else {
    // Seed some default ratings so there's data to display
    allRatings.value = [4, 5, 4, 3, 5, 4, 5, 4, 3, 5]
    localStorage.setItem(key, JSON.stringify(allRatings.value))
  }
}

// --- Computed: Average rating & review count (BR C.3) ---
const averageRating = computed(() => {
  if (allRatings.value.length === 0) return 0
  const sum = allRatings.value.reduce((acc, r) => acc + r, 0)
  return sum / allRatings.value.length
})

const reviewCount = computed(() => allRatings.value.length)

const averageDisplay = computed(() => averageRating.value.toFixed(1))

// --- Submit a rating (BR C.3) ---
function submitRating(stars) {
  userRating.value = stars
  allRatings.value.push(stars)
  // Persist to LocalStorage
  const key = `ihc_ratings_${props.resourceId}`
  localStorage.setItem(key, JSON.stringify(allRatings.value))
}

onMounted(() => {
  loadRatings()
})
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
        @click="submitRating(star)"
        @mouseenter="hoverStar = star"
        @mouseleave="hoverStar = 0"
        role="button"
        :aria-label="`Rate ${star} out of 5 stars`"
      ></i>
    </div>

    <!-- Aggregated display (BR C.3) -->
    <p class="mb-1 fw-medium">
      Community Rating: {{ averageDisplay }} out of 5
      <span class="text-muted">based on {{ reviewCount }} reviews</span>
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
</style>
