import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index.js'
import './assets/globals.css'

const app = createApp(App)

// Make app version available globally
app.config.globalProperties.$root = {
  appVersion: import.meta.env.VITE_APP_VERSION || '1.0.2'
}

app.use(createPinia())
app.use(router)
app.mount('#app')

// ─── Auto-Updater Debug Listeners ────────────────────────────────────────────
if (window.electronAPI?.updater) {
  console.log('[Updater] API available, setting up listeners...')
  console.log('[Updater] Current version:', import.meta.env.VITE_APP_VERSION || '1.0.2')
  
  window.electronAPI.updater.onStatusChange((data) => {
    console.log('[Updater] Status:', data.type, data)
    
    if (data.type === 'available') {
      console.log(`[Updater] ✅ Nueva versión ${data.info.version} disponible!`)
    } else if (data.type === 'ready') {
      console.log(`[Updater] ✅ Versión ${data.info.version} lista para instalar!`)
    } else if (data.type === 'error') {
      console.error('[Updater] ❌ Error:', data.message)
    }
  })
  
  window.electronAPI.updater.onProgress((data) => {
    console.log(`[Updater] Descargando: ${data.percent}%`)
  })
  
  console.log('[Updater] Listeners configurados')
} else {
  console.warn('[Updater] API no disponible (modo desarrollo?)')
}
