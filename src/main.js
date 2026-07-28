// import './assets/main.css'
// import '@/assets/style.css'
import 'bootstrap/dist/css/bootstrap.min.css'


import { initializeApp } from "firebase/app";
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCcv7Xk9CQNeOdmtApemxII39rEdRv8yLc",
  authDomain: "auth-w6.firebaseapp.com",
  projectId: "auth-w6",
  storageBucket: "auth-w6.firebasestorage.app",
  messagingSenderId: "69737616928",
  appId: "1:69737616928:web:30fd81e9525c5429170e45"
};

// Initialize Firebase
initializeApp(firebaseConfig);

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
// import DataTable from 'primevue/datatable'
// import Column from 'primevue/Column'

const app = createApp(App)
app.use(PrimeVue, { theme: { preset: Aura } })
app.use(router)

// app.component('DataTable', DataTable)
// app.component('Column', Column)

app.mount('#app')