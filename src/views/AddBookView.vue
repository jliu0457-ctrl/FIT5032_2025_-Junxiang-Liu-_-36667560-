<template>
  <div class="add-book">
    <h2>Add New Book</h2>

    <div v-if="message" :class="['alert', messageType]" role="alert">
      {{ message }}
    </div>

    <form @submit.prevent="addBook">
      <div class="mb-3">
        <label for="isbn" class="form-label">ISBN</label>
        <input
          type="number"
          id="isbn"
          class="form-control"
          v-model.number="isbn"
          required
        />
      </div>
      <div class="mb-3">
        <label for="name" class="form-label">Name</label>
        <input
          type="text"
          id="name"
          class="form-control"
          v-model="name"
          required
        />
      </div>
      <button type="submit" class="btn btn-primary" :disabled="loading">
        {{ loading ? "Adding..." : "Add Book" }}
      </button>
    </form>

    <BookList ref="bookListRef" />
  </div>
</template>

<script setup>
import { ref } from "vue";
import { collection, addDoc } from "firebase/firestore";
import db from "../firebase/init";
import BookList from "../components/BookList.vue";

const isbn = ref(null);
const name = ref("");
const loading = ref(false);
const message = ref("");
const messageType = ref("alert-success");
const bookListRef = ref(null);

async function addBook() {
  loading.value = true;
  message.value = "";
  try {
    await addDoc(collection(db, "books"), {
      isbn: isbn.value,
      name: name.value,
    });
    message.value = `Book "${name.value}" (ISBN: ${isbn.value}) added successfully!`;
    messageType.value = "alert-success";
    isbn.value = null;
    name.value = "";
    bookListRef.value?.fetchBooks();
  } catch (error) {
    console.error(error);
    message.value = "Error adding book: " + (error.code || error.message);
    messageType.value = "alert-danger";
  } finally {
    loading.value = false;
  }
}
</script>
