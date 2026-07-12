<template>
  <div class="form-page-wrapper">
    <div class="form-inner py-5">
      <h1 class="text-center mb-5">User Information Form</h1>

      <div class="row justify-content-center">
        <div class="col-xl-8 col-lg-10">
          <div class="card border-0 shadow-sm mb-5">
            <div class="card-body px-4 py-5">
              <form @submit.prevent="submitForm">
                <div class="row gx-4 gy-3">
                  <div class="col-md-6">
                    <label for="username" class="form-label">Username</label>
                    <input
                      id="username"
                      type="text"
                      class="form-control"
                      v-model="formData.username"
                      placeholder="Enter username"
                    />
                  </div>
                  <div class="col-md-6">
                    <label for="password" class="form-label">Password</label>
                    <input
                      id="password"
                      type="password"
                      class="form-control"
                      v-model="formData.password"
                      placeholder="Enter password"
                    />
                  </div>
                  <div class="col-md-6">
                    <div class="form-check mt-3">
                      <input
                        id="isAustralian"
                        type="checkbox"
                        class="form-check-input"
                        v-model="formData.isAustralian"
                      />
                      <label class="form-check-label" for="isAustralian">Australian Resident?</label>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <label for="gender" class="form-label">Gender</label>
                    <select id="gender" class="form-select" v-model="formData.gender">
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div class="col-12">
                    <label for="reason" class="form-label">Reason for joining</label>
                    <textarea
                      id="reason"
                      rows="3"
                      class="form-control"
                      v-model="formData.reason"
                      placeholder="Tell us why you want to join"
                    ></textarea>
                  </div>

                  <div class="col-12 text-center mt-4">
                    <button type="submit" class="btn btn-primary px-5 me-2">Submit</button>
                    <button type="button" class="btn btn-outline-secondary px-4" @click="clearForm">Clear</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div class="row justify-content-center">
        <div class="col-12 col-xxl-10">
          <div class="submission-grid" v-if="submittedCards.length">
            <div class="submission-card" v-for="(card, index) in submittedCards" :key="index">
              <div class="submission-card-header">User Information</div>
              <ul class="submission-list">
                <li class="submission-list-item">Username: {{ card.username || 'None' }}</li>
                <li class="submission-list-item">Password: {{ card.password || 'None' }}</li>
                <li class="submission-list-item">Australian Resident: {{ card.isAustralian ? 'Yes' : 'No' }}</li>
                <li class="submission-list-item">Gender: {{ card.gender || 'Not selected' }}</li>
                <li class="submission-list-item">Reason: {{ card.reason || 'None' }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const formData = ref({
  username: '',
  password: '',
  isAustralian: false,
  reason: '',
  gender: ''
});

const submittedCards = ref([]);

const submitForm = () => {
  submittedCards.value.push({ ...formData.value });
  clearForm();
};

const clearForm = () => {
  formData.value = {
    username: '',
    password: '',
    isAustralian: false,
    reason: '',
    gender: ''
  };
};
</script>

<style scoped>
.form-page-wrapper {
  display: flex;
  justify-content: center;
  width: 100%;
}

.form-inner {
  width: 100%;
  max-width: 1200px;
  padding: 0 1rem;
}

.card {
  border-radius: 0.75rem;
}

.submission-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(280px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}

.submission-card {
  min-width: 280px;
  border: 1px solid #dee2e6;
  border-radius: 0.75rem;
  background: #fff;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.submission-card-header {
  background: #2563eb;
  color: #fff;
  font-weight: 600;
  padding: 0.9rem 1rem;
}

.submission-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.submission-list-item {
  padding: 0.9rem 1rem;
  border-top: 1px solid #e9ecef;
  white-space: nowrap;
}

.submission-list-item:first-child {
  border-top: none;
}

@media (max-width: 1200px) {
  .form-inner {
    max-width: 1000px;
  }

  .submission-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .submission-grid {
    grid-template-columns: 1fr;
  }
}
</style>
