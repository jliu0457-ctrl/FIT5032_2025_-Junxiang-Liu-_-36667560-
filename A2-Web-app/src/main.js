// main.js — Application Entry Point
// BR (A.1): Bootstrap 5 integration for responsive layout framework
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// Bootstrap 5 CSS & JS
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

// Bootstrap Icons
import 'bootstrap-icons/font/bootstrap-icons.css'

// Custom global styles
import './style.css'

const app = createApp(App)
app.use(router)
app.mount('#app')
