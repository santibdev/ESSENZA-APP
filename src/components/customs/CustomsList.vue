<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Video, Image, Mic, CheckCircle2, Clock, Send, Upload, RefreshCw } from 'lucide-vue-next'
import { customsApi } from '@/lib/customsApi'
import CompleteCustomModal from './CompleteCustomModal.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const props = defineProps<{ modelIds?: number[] }>()
const customs = ref<any[]>([])
const loading = ref(false)
const completeOpen = ref(false)
const selectedCustomId = ref<number | null>(null)
let pollInterval: ReturnType<typeof setInterval> | null = null

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  CREATED: { label: 'Creado', icon: Clock, color: 'text-zinc-500' },
  SENT: { label: 'Enviado', icon: Send, color: 'text-blue-500' },
  READY_FOR_UPLOAD: { label: 'Listo para subir', icon: Upload, color: 'text-amber-500' },
  COMPLETED: { label: 'Completado', icon: CheckCircle2, color: 'text-emerald-500' },
}

const typeConfig: Record<string, { label: string; icon: any; color: string }> = {
  VIDEO_CALL: { label: 'Videollamada', icon: Video, color: 'text-blue-500' },
  IMAGE: { label: 'Imágenes/Videos', icon: Image, color: 'text-purple-500' },
  AUDIO: { label: 'Audio', icon: Mic, color: 'text-amber-500' },
}

const priorityConfig: Record<string, { label: string; dot: string }> = {
  LOW: { label: 'Baja', dot: 'bg-zinc-400' },
  NORMAL: { label: 'Normal', dot: 'bg-blue-500' },
  HIGH: { label: 'Alta', dot: 'bg-orange-500' },
  URGENT: { label: 'Urgente', dot: 'bg-red-500' },
}

const readyCount = computed(() => customs.value.filter(c => c.status === 'READY_FOR_UPLOAD').length)

async function load() {
  loading.value = true
  try {
    // Load customs for all assigned models (shared between chatters of same model)
    const ids = props.modelIds?.length ? props.modelIds : []
    if (!ids.length) { customs.value = []; return }
    const results = await Promise.all(ids.map(id => customsApi.list({ modelId: id })))
    // Flatten and deduplicate
    const all = results.flat()
    const seen = new Set<number>()
    customs.value = all.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch { } finally {
    loading.value = false
  }
}

function openComplete(id: number) {
  selectedCustomId.value = id
  completeOpen.value = true
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function parseTemplate(data: string) {
  try { return JSON.parse(data) } catch { return {} }
}

onMounted(() => {
  load()
  pollInterval = setInterval(load, 30000)
})
onUnmounted(() => { if (pollInterval) clearInterval(pollInterval) })
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <h3 class="text-sm font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Mis Customs</h3>
        <span v-if="readyCount > 0"
          class="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
          {{ readyCount }} listo{{ readyCount > 1 ? 's' : '' }}
        </span>
      </div>
      <button @click="load" class="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
        <RefreshCw class="w-3.5 h-3.5 text-zinc-400" :class="{ 'animate-spin': loading }" />
      </button>
    </div>

    <!-- Ready for upload banner -->
    <div v-if="readyCount > 0"
      class="mb-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center gap-2">
      <Upload class="w-4 h-4 text-amber-600 shrink-0" />
      <p class="text-xs font-semibold text-amber-700 dark:text-amber-400">
        Tenés {{ readyCount }} custom{{ readyCount > 1 ? 's' : '' }} listo{{ readyCount > 1 ? 's' : '' }} para subir el link de Drive
      </p>
    </div>

    <ScrollArea class="flex-1">
      <div v-if="loading && !customs.length" class="flex items-center justify-center py-12">
        <RefreshCw class="w-5 h-5 text-zinc-400 animate-spin" />
      </div>

      <div v-else-if="!customs.length" class="flex flex-col items-center justify-center py-12 text-zinc-400">
        <Image class="w-8 h-8 mb-2 opacity-40" />
        <p class="text-sm">No tenés customs creados</p>
      </div>

      <div v-else class="space-y-2 pr-2">
        <div v-for="custom in customs" :key="custom.id"
          class="p-3 rounded-xl border transition-all"
          :class="custom.status === 'READY_FOR_UPLOAD'
            ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50/50 dark:bg-amber-500/5'
            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50'">

          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <!-- Type icon -->
              <span class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                :class="typeConfig[custom.type]?.color.replace('text-', 'bg-').replace('500', '500/10')">
                <component :is="typeConfig[custom.type]?.icon" class="w-3.5 h-3.5"
                  :class="typeConfig[custom.type]?.color" />
              </span>
              <div class="min-w-0">
                <p class="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {{ custom.model?.name || 'Modelo' }}
                </p>
                <p class="text-[10px] text-zinc-400">{{ formatDate(custom.createdAt) }}</p>
              </div>
            </div>

            <!-- Status + Priority -->
            <div class="flex flex-col items-end gap-1 shrink-0">
              <div class="flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full" :class="priorityConfig[custom.priority]?.dot" />
                <component :is="statusConfig[custom.status]?.icon" class="w-3.5 h-3.5"
                  :class="statusConfig[custom.status]?.color" />
                <span class="text-[10px] font-semibold" :class="statusConfig[custom.status]?.color">
                  {{ statusConfig[custom.status]?.label }}
                </span>
              </div>
            </div>
          </div>

          <!-- Drive link if completed -->
          <div v-if="custom.status === 'COMPLETED' && custom.driveLink" class="mt-2">
            <a :href="custom.driveLink" target="_blank"
              class="text-xs text-blue-500 hover:underline flex items-center gap-1">
              <Upload class="w-3 h-3" /> Ver en Drive
            </a>
          </div>

          <!-- Complete button -->
          <div v-if="custom.status === 'READY_FOR_UPLOAD'" class="mt-2">
            <Button size="sm" class="w-full h-7 text-xs" @click="openComplete(custom.id)">
              Subir Link de Drive
            </Button>
          </div>
        </div>
      </div>
    </ScrollArea>

    <CompleteCustomModal
      v-model:open="completeOpen"
      :custom-id="selectedCustomId"
      @completed="load"
    />
  </div>
</template>
