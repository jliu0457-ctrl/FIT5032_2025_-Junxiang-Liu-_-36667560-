<template>
  <div class="book-counter">
    <h1>Book Counter</h1>
    <button @click="getBookCount" class="btn btn-primary" :disabled="loading">
      {{ loading ? 'Loading...' : 'Get Book Count' }}
    </button>
    <div v-if="count !== null">
      <p>Total number of books: {{ count }}</p>
    </div>
    <div v-else>
      <p>error</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'

const count = ref(null)
const loading = ref(false)

async function getBookCount() {
  loading.value = true
  try {
    const response = await axios.get('https://2hhcp8761k.execute-api.us-east-1.amazonaws.com/default/bookCountFunction')
    count.value = response.data.count
  } catch (err) {
    console.error(err)
    count.value = null
  } finally {
    loading.value = false
  }
}
</script>
