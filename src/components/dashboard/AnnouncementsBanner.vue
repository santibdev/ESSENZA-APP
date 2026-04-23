<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Megaphone, X, Bell, AlertTriangle } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import api from '@/api'

const auth = useAuthStore()
const announcements = ref<any[]>([])
const loading = ref(true)
const closedIds = ref<number[]>(JSON.parse(localStorage.getItem('essenza_closed_announcements') || '[]'))

const fetchAnnouncements = async () => {
  try {
    const res = await api.get('/announcements')
    // Sort so Flash appears first
    announcements.value = res.data.sort((a, b) => (b.isFlash ? 1 : 0) - (a.isFlash ? 1 : 0))
  } catch (err) {
    console.error('Failed to fetch announcements', err)
  } finally {
    loading.value = false
  }
}

const visibleAnnouncements = computed(() => {
  return announcements.value.filter(ann => !closedIds.value.includes(ann.id))
})

const closeAnnouncement = (id: number) => {
  closedIds.value.push(id)
  localStorage.setItem('essenza_closed_announcements', JSON.stringify(closedIds.value))
}

let interval = null
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

const getColor = (ann: any) => {
  if (ann.isFlash) return 'bg-rose-600 shadow-rose-500/20'
  switch (ann.type) {
    case 'WARNING': return 'bg-amber-600 shadow-amber-500/20'
    case 'SUCCESS': return 'bg-emerald-600 shadow-emerald-500/20'
    default: return 'bg-indigo-600 shadow-indigo-500/20'
  }
}
</script>

<template>
  <div v-if="visibleAnnouncements.length > 0" class="space-y-4">
    <div v-for="ann in visibleAnnouncements" :key="ann.id"
      class="relative overflow-hidden group rounded-[2.5rem] p-8 text-white shadow-2xl animate-in slide-in-from-top duration-700"
      :class="[getColor(ann), ann.isFlash ? 'ring-4 ring-white/20 animate-pulse' : '']">

      <!-- Decor -->
      <div
        class="absolute top-0 right-0 p-12 opacity-10 translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition-transform">
        <component :is="getIcon(ann.type)" class="w-32 h-32" />
      </div>

      <div class="relative z-10 flex items-center justify-between gap-8">
        <div class="flex items-center gap-6">
          <div
            class="w-16 h-16 rounded-[2rem] bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner shrink-0">
            <component :is="getIcon(ann.type)" class="w-7 h-7" />
          </div>
          <div>
            <div class="flex items-center gap-2 mb-1.5">
              <span v-if="ann.isFlash" class="px-2 py-0.5 rounded-full bg-white text-rose-600 text-[8px] font-black uppercase tracking-widest">Flash Alert</span>
              <h4 class="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">{{ ann.title }}</h4>
            </div>
            <p class="text-lg font-black leading-tight tracking-tight max-w-2xl">{{ ann.text }}</p>
          </div>
        </div>
        <button @click="closeAnnouncement(ann.id)"
          class="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center shrink-0 border border-white/10">
          <X class="w-6 h-6" />
        </button>
      </div>
    </div>
  </div>
</template>
