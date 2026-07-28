import { ref } from 'vue'

export const isAuthenticated = ref(false)
export const currentUser = ref('')
export const currentRole = ref('')

export function login(username, password, role = 'Member') {
  if (username.trim() && password.trim()) {
    isAuthenticated.value = true
    currentUser.value = username
    currentRole.value = role
    return true
  }
  return false
}

export function logout() {
  isAuthenticated.value = false
  currentUser.value = ''
  currentRole.value = ''
}
