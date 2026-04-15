import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref('dark')

  const isDark = computed(() => theme.value === 'dark')

  function applyTheme() {
    if (theme.value === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  function initTheme() {
    const saved = localStorage.getItem('app-theme')
    if (saved === 'light' || saved === 'dark') {
      theme.value = saved
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      theme.value = prefersDark ? 'dark' : 'light'
    }
    applyTheme()
  }

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    localStorage.setItem('app-theme', theme.value)
    applyTheme()
  }

  function setTheme(newTheme) {
    theme.value = newTheme
    localStorage.setItem('app-theme', newTheme)
    applyTheme()
  }

  return { theme, isDark, initTheme, toggleTheme, setTheme }
})
