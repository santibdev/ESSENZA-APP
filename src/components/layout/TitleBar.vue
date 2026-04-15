<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Minus, X, Maximize2, Minimize2 } from 'lucide-vue-next'
import ThemeToggle from './ThemeToggle.vue'

const isMaximized = ref(false)

const minimize = () => window.electronAPI?.window.minimize()
const toggleMaximize = () => window.electronAPI?.window.maximize()
const close = () => window.electronAPI?.window.close()

let cleanupFn = null

onMounted(async () => {
  if (!window.electronAPI) return
  isMaximized.value = await window.electronAPI.window.isMaximized()
  cleanupFn = window.electronAPI.window.onStateChanged((val) => {
    isMaximized.value = val
  })
})

onBeforeUnmount(() => cleanupFn?.())
</script>

<template>
  <!-- -webkit-app-region: drag → permite arrastrar la ventana -->
  <header class="titlebar h-11 flex items-center justify-between px-4 flex-shrink-0
           bg-card border-b border-border relative select-none" style="-webkit-app-region: drag">
    <!-- Brand -->
    <div class="flex items-center gap-2.5" style="-webkit-app-region: no-drag">
      <span class="text-[13px] font-black text-foreground tracking-widest uppercase">
        EssenzaModels
      </span>
    </div>

    <!-- Controls -->
    <div class="flex items-center gap-1" style="-webkit-app-region: no-drag">
      <ThemeToggle />

      <div class="w-px h-5 bg-border mx-1" />

      <!-- Minimize -->
      <button id="btn-minimize" @click="minimize" title="Minimizar" class="win-btn hover:bg-secondary">
        <Minus class="w-3.5 h-3.5" />
      </button>

      <!-- Maximize / Restore -->
      <button id="btn-maximize" @click="toggleMaximize" :title="isMaximized ? 'Restaurar' : 'Maximizar'"
        class="win-btn hover:bg-secondary">
        <Maximize2 v-if="!isMaximized" class="w-3.5 h-3.5" />
        <Minimize2 v-else class="w-3.5 h-3.5" />
      </button>

      <!-- Close -->
      <button id="btn-close" @click="close" title="Cerrar" class="win-btn hover:bg-destructive hover:text-white">
        <X class="w-3.5 h-3.5" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.win-btn {
  @apply w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground transition-all duration-150 hover:text-foreground;
}
</style>
