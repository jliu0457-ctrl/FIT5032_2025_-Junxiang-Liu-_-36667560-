<template>
  <div class="firebase-login">
    <h1>Sign in</h1>
    <p><input type="text" placeholder="Email" v-model="email" /></p>
    <p><input type="password" placeholder="Password" v-model="password" /></p>
    <p><button @click="signin">Sign in via Firebase</button></p>
  </div>
</template>

<style scoped>
.firebase-login {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}
</style>

<script setup>
import { ref } from "vue";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "vue-router";
import { isAuthenticated, currentUser, currentRole } from "../auth.js";

const email = ref("");
const password = ref("");
const router = useRouter();
const auth = getAuth();

const signin = () => {
  signInWithEmailAndPassword(auth, email.value, password.value)
    .then((data) => {
      console.log("Firebase Login Successful!");
      isAuthenticated.value = true;
      currentUser.value = email.value;
      currentRole.value = "Member";
      router.push("/");
      console.log("Current User:", auth.currentUser);
    }).catch((error) => {
      console.log(error.code);
    });
};
</script>