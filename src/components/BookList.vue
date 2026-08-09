<template>
  <div class="book-list mt-4">
    <h3>Books (ISBN > 1000)</h3>
    <div v-if="loading" class="text-muted">Loading books...</div>
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-else-if="books.length === 0" class="text-muted">No books found.</div>
    <table v-else class="table table-striped">
      <thead>
        <tr>
          <th>ISBN</th>
          <th>Name</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="book in books" :key="book.id">
          <td v-if="editingId !== book.id">{{ book.isbn }}</td>
          <td v-else>
            <input
              type="number"
              class="form-control form-control-sm"
              v-model.number="editIsbn"
            />
          </td>
          <td v-if="editingId !== book.id">{{ book.name }}</td>
          <td v-else>
            <input
              type="text"
              class="form-control form-control-sm"
              v-model="editName"
            />
          </td>
          <td>
            <template v-if="editingId !== book.id">
              <button class="btn btn-sm btn-warning me-1" @click="startEdit(book)">
                Edit
              </button>
              <button class="btn btn-sm btn-danger" @click="deleteBook(book.id)">
                Delete
              </button>
            </template>
            <template v-else>
              <button class="btn btn-sm btn-success me-1" @click="updateBook(book.id)">
                Save
              </button>
              <button class="btn btn-sm btn-secondary" @click="cancelEdit">
                Cancel
              </button>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import db from "../firebase/init";

const books = ref([]);
const loading = ref(false);
const error = ref("");

const editingId = ref(null);
const editIsbn = ref(null);
const editName = ref("");

onMounted(() => {
  fetchBooks();
});

async function fetchBooks() {
  loading.value = true;
  error.value = "";
  try {
    const q = query(
      collection(db, "books"),
      where("isbn", ">", 1000),
      orderBy("isbn"),
      limit(10)
    );
    const querySnapshot = await getDocs(q);
    books.value = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (err) {
    console.error(err);
    error.value = "Error fetching books: " + (err.code || err.message);
  } finally {
    loading.value = false;
  }
}

function startEdit(book) {
  editingId.value = book.id;
  editIsbn.value = book.isbn;
  editName.value = book.name;
}

function cancelEdit() {
  editingId.value = null;
  editIsbn.value = null;
  editName.value = "";
}

async function updateBook(bookId) {
  try {
    const docRef = doc(db, "books", bookId);
    await updateDoc(docRef, {
      isbn: editIsbn.value,
      name: editName.value,
    });
    cancelEdit();
    fetchBooks();
  } catch (err) {
    console.error(err);
    error.value = "Error updating book: " + (err.code || err.message);
  }
}

async function deleteBook(bookId) {
  try {
    const docRef = doc(db, "books", bookId);
    await deleteDoc(docRef);
    fetchBooks();
  } catch (err) {
    console.error(err);
    error.value = "Error deleting book: " + (err.code || err.message);
  }
}

defineExpose({ fetchBooks });
</script>
