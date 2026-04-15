import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  const isAuthenticated = computed(() => !!user.value)

  // Initialize from localStorage
  const savedUser = localStorage.getItem('user')
  if (savedUser) {
    try {
      user.value = JSON.parse(savedUser)
    } catch {
      localStorage.removeItem('user')
    }
  }

  /**
   * Login — replace mock logic with your real API call here
   */
  async function login(username, password) {
    isLoading.value = true
    error.value = null

    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })

      if (!res.ok) {
        throw new Error('Usuario o contraseña incorrectos')
      }

      const data = await res.json()
      
      const userData = {
        id: data.id,
        name: data.name,
        username: data.username,
        role: data.role,
        token: data.token,
        shiftTargetSeconds: data.shiftTargetSeconds,
        breakTargetSeconds: data.breakTargetSeconds
      }
      user.value = userData
      localStorage.setItem('user', JSON.stringify(userData))
      return { success: true }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  function logout() {
    user.value = null
    error.value = null
    localStorage.removeItem('user')
  }

  function clearError() {
    error.value = null
  }

  return { user, isAuthenticated, isLoading, error, login, logout, clearError }
})
