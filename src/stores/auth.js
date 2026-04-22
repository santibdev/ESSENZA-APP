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
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://essenza-core-production.up.railway.app/api/v1'
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
        mustChangePassword: data.mustChangePassword,
        timezone: data.timezone || 'America/Argentina/Buenos_Aires',
        shiftTargetSeconds: data.shiftTargetSeconds,
        breakTargetSeconds: data.breakTargetSeconds
      }
      
      if (data.mustChangePassword) {
        return { success: true, mustChangePassword: true, tempUser: userData }
      }

      user.value = userData
      localStorage.setItem('user', JSON.stringify(userData))
      return { success: true, mustChangePassword: false }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  async function refreshUserProfile() {
    if (!user.value) return
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://essenza-core-production.up.railway.app/api/v1'
      const res = await fetch(`${apiUrl}/admin/users/me`, {
        headers: {
          'Authorization': `Bearer ${user.value.token}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        user.value = { 
          ...user.value, 
          shiftTargetSeconds: data.shiftTargetSeconds,
          breakTargetSeconds: data.breakTargetSeconds,
          name: data.name,
          timezone: data.timezone || user.value.timezone
        }
        localStorage.setItem('user', JSON.stringify(user.value))
      }
    } catch (e) {
      console.error('Error refreshing profile:', e)
    }
  }

  async function changePassword(userId, token, newPassword) {
    isLoading.value = true
    error.value = null
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://essenza-core-production.up.railway.app/api/v1'
      const res = await fetch(`${apiUrl}/admin/users/me/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      })

      if (!res.ok) throw new Error('Error al actualizar contraseña')
      return { success: true }
    } catch (err) {
      error.value = err.message
      return { success: false }
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

  function updateTimezone(tz) {
    if (!user.value) return
    user.value.timezone = tz
    localStorage.setItem('user', JSON.stringify(user.value))
  }

  return { user, isAuthenticated, isLoading, error, login, logout, clearError, changePassword, updateTimezone, refreshUserProfile }
})
