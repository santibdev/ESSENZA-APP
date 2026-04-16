<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Download, RefreshCw, X } from 'lucide-vue-next'

const state = ref('idle') // 'idle' | 'downloading' | 'ready'
const updateInfo = ref(null)
const dismissed = ref(false)

let cleanupStatus = null

onMounted(() => {
  if (!window.electronAPI?.updater) return

  cleanupStatus = window.electronAPI.updater.onStatusChange(({ type, info }) => {
    if (type === 'available') {
      updateInfo.value = info
      state.value = 'downloading'
      dismissed.value = false
    } else if (type === 'ready') {
      updateInfo.value = info
      state.value = 'ready'
      dismissed.value = false
    }
  })
})

onUnmounted(() => {
  cleanupStatus?.()
})

function installNow() {
  window.electronAPI.updater.installNow()
}

function dismiss() {
  dismissed.value = true
}
</script>

<template>
  <Transition name="banner">
    <div
      v-if="!dismissed && state !== 'idle'"
      class="update-banner"
      :class="{ 'is-ready': state === 'ready' }"
    >
      <div class="banner-content">
        <div class="banner-icon">
          <RefreshCw v-if="state === 'downloading'" class="icon spin" :size="15" />
          <Download v-else class="icon" :size="15" />
        </div>

        <div class="banner-text">
          <span v-if="state === 'downloading'">
            Descargando actualizaciÃ³n <strong>v{{ updateInfo?.version }}</strong> en segundo planoâ€¦
          </span>
          <span v-else>
            Â¡ActualizaciÃ³n <strong>v{{ updateInfo?.version }}</strong> lista! ReiniciÃ¡ para aplicarla.
          </span>
        </div>

        <div class="banner-actions">
          <button v-if="state === 'ready'" class="btn-install" @click="installNow">
            Instalar ahora
          </button>
          <button class="btn-dismiss" @click="dismiss" title="Cerrar">
            <X :size="13" />
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.update-banner {
  position: relative;
  z-index: 100;
  background: linear-gradient(90deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  border-bottom: 1px solid rgba(99, 102, 241, 0.3);
  padding: 0;
  overflow: hidden;
}

.update-banner::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.07), transparent);
  animation: shimmer 2.5s ease-in-out infinite;
}

.update-banner.is-ready {
  background: linear-gradient(90deg, #0d1f12 0%, #0a2e1a 50%, #0d2e1a 100%);
  border-bottom-color: rgba(16, 185, 129, 0.4);
}

.update-banner.is-ready::before {
  background: linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.07), transparent);
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 14px;
  position: relative;
  z-index: 1;
}

.banner-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.icon {
  color: #818cf8;
}

.is-ready .icon {
  color: #34d399;
}

.spin {
  animation: spin 1.4s linear infinite;
}

.banner-text {
  flex: 1;
  font-size: 12px;
  color: #a5b4fc;
  line-height: 1.4;
}

.is-ready .banner-text {
  color: #6ee7b7;
}

.banner-text strong {
  color: #e0e7ff;
  font-weight: 600;
}

.is-ready .banner-text strong {
  color: #d1fae5;
}

.banner-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.btn-install {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #34d399;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.02em;
}

.btn-install:hover {
  background: rgba(16, 185, 129, 0.25);
  border-color: rgba(16, 185, 129, 0.7);
  color: #a7f3d0;
}

.btn-dismiss {
  background: transparent;
  border: none;
  color: #4b5563;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.2s ease;
}

.btn-dismiss:hover {
  color: #9ca3af;
}

/* Transition */
.banner-enter-active {
  animation: slideDown 0.3s ease-out;
}
.banner-leave-active {
  animation: slideUp 0.25s ease-in forwards;
}

@keyframes slideDown {
  from { max-height: 0; opacity: 0; }
  to   { max-height: 60px; opacity: 1; }
}

@keyframes slideUp {
  from { max-height: 60px; opacity: 1; }
  to   { max-height: 0; opacity: 0; }
}

@keyframes shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
</style>
