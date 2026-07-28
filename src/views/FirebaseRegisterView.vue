<template>
  <div class="firebase-register">
    <h1>Create an Account</h1>
    <p><input type="text" placeholder="Email" v-model="email" /></p>
    <p><input type="password" placeholder="Password" v-model="password" /></p>
    <p><button @click="register">Save to Firebase</button></p>
  </div>
</template>

<style scoped>
.firebase-register {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}
</style>

<script setup>
import { ref } from "vue"
import {getAuth, createUserWithEmailAndPassword} from "firebase/auth"
import {useRouter} from "vue-router"
import { isAuthenticated, currentUser, currentRole } from "../auth.js"

const email = ref("")
const password = ref("")
const router = useRouter()
const auth = getAuth()

const register = () => {
  createUserWithEmailAndPassword(auth, email.value, password.value)
  .then((data) => {
    console.log("Firebase Register Successful!")
    isAuthenticated.value = true;
    currentUser.value = email.value;
    currentRole.value = "Member";
    router.push("/")
  }).catch((error) => {
    console.log(error.code);
  })
};
</script>