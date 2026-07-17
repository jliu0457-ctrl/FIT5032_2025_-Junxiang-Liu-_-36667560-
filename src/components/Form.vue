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
                    <input id="username" type="text" class="form-control"
                      v-model="formData.username"
                      placeholder="Enter username"
                      @blur="validateUsername"
                      @input="() => validateUsername(false)"
                    />
                    <div v-if="errors.username" class="text-danger">{{ errors.username }}</div>
                  </div>
                  <div class="col-md-6">
                    <label for="password" class="form-label">Password</label>
                    <input id="password" type="password" class="form-control"
                      v-model="formData.password"
                      placeholder="Enter password"
                      @blur="validatePassword"
                      @input="() => validatePassword(false)"
                    />
                    <div v-if="errors.password" class="text-danger">{{ errors.password }}</div>
                  </div>
                  <div class="col-md-6">
                    <div class="form-check mt-3">
                      <input id="isAustralian" type="checkbox" class="form-check-input"
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
          <DataTable v-if="submittedCards.length" :value="submittedCards" paginator :rows="5" :rowsPerPageOptions="[5, 10, 20]">
            <Column field="username" header="Username">
              <template #body="{ data }">
                {{ data.username || 'None' }}
              </template>
            </Column>
            <Column field="password" header="Password">
              <template #body="{ data }">
                {{ data.password || 'None' }}
              </template>
            </Column>
            <Column field="isAustralian" header="Australian Resident">
              <template #body="{ data }">
                {{ data.isAustralian ? 'Yes' : 'No' }}
              </template>
            </Column>
            <Column field="gender" header="Gender">
              <template #body="{ data }">
                {{ data.gender || 'Not selected' }}
              </template>
            </Column>
            <Column field="reason" header="Reason">
              <template #body="{ data }">
                {{ data.reason || 'None' }}
              </template>
            </Column>
          </DataTable>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';

const formData = ref({
  username: '',
  password: '',
  isAustralian: false,
  reason: '',
  gender: ''
});

const errors = ref({
  username: null,
  password: null,
  isAustralian: null,
  gender: null,
  reason: null
});

const submittedCards = ref([]);

const validateUsername = (blur) => {
  if (formData.value.username.length < 3) {
    if(blur)  errors.value.username = 'Username must be at least 3 characters long.';
  } else {
    errors.value.username = null;
  }
};

const validatePassword = (blur) => {
  const password = formData.value.password;
  const minLength = 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (blur) {
    if (password.length < minLength) {
      errors.value.password = 'Password must be at least 8 characters long.';
    } else if (!hasUppercase) {
      errors.value.password = 'Password must contain at least one uppercase letter.';
    } else if (!hasLowercase) {
      errors.value.password = 'Password must contain at least one lowercase letter.';
    } else if (!hasNumber) {
      errors.value.password = 'Password must contain at least one number.';
    } else if (!hasSpecialChar) {
      errors.value.password = 'Password must contain at least one special character.';
    } else {
      errors.value.password = null;
    }
  }
};

const submitForm = () => {
  validateUsername(true);
  validatePassword(true);
  if (!errors.value.username && !errors.value.password) {
    submittedCards.value.push({ ...formData.value });
    clearForm();
  }
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
  margin: 0 auto;
  padding: 0 1rem;
}

.card {
  border-radius: 0.75rem;
}

@media (max-width: 1200px) {
  .form-inner {
    max-width: 1000px;
  }
}

</style>
