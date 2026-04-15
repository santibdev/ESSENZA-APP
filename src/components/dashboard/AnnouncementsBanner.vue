<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Megaphone, X, Bell, AlertTriangle } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const announcements = ref<any[]>([])
const show = ref(true)
const loading = ref(true)

const fetchAnnouncements = async () => {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://essenza-core-production.up.railway.app/v1/api'}/announcements`, {
      headers: { 'Authorization': `Bearer ${auth.user?.token}` }
    })
    if (res.ok) {
      announcements.value = await res.json()
    }
  } catch (err) {
    console.error('Failed to fetch announcements', err)
  } finally {
    loading.value = false
  }
}

let interval: any = null
onMounted(() => {
  fetchAnnouncements()
  interval = setInterval(fetchAnnouncements, 60000) // Poll every 1m
})
onUnmounted(() => clearInterval(interval))

const getIcon = (type: string) => {
  switch (type) {
    case 'WARNING': return AlertTriangle
    case 'SUCCESS': return Bell
    default: return Megaphone
  }
}

const getColor = (type: string) => {
  switch (type) {
    case 'WARNING': return 'bg-amber-600'
    case 'SUCCESS': return 'bg-emerald-600'
    default: return 'bg-primary'
  }
}
</script>

<template>
  <div v-if="show && announcements.length > 0" class="space-y-3">
    <div v-for="ann in announcements" :key="ann.id"
      class="relative overflow-hidden group rounded-[2.5rem] p-8 text-white shadow-2xl shadow-primary/10 animate-in slide-in-from-top duration-700"
      :class="getColor(ann.type)">

      <!-- Decor -->
      <div
        class="absolute top-0 right-0 p-12 opacity-10 translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition-transform">
        <component :is="getIcon(ann.type)" class="w-32 h-32" />
      </div>

      <div class="relative z-10 flex items-center justify-between gap-8">
        <div class="flex items-center gap-6">
          <div
            class="w-16 h-16 rounded-[2rem] bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
            <component :is="getIcon(ann.type)" class="w-7 h-7" />
          </div>
          <div>
            <h4 class="text-[10px] font-black uppercase tracking-[0.3em] opacity-70 mb-1.5">{{ ann.title }}</h4>
            <p class="text-lg font-black leading-tight tracking-tight">{{ ann.text }}</p>
          </div>
        </div>
        <button @click="show = false"
          class="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center shrink-0">
          <X class="w-6 h-6" />
        </button>
      </div>
    </div>
  </div>
</template>
