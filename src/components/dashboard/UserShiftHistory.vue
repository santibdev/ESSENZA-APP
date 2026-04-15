<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Clock, Calendar, ChevronRight, Activity } from 'lucide-vue-next'
import api from '@/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const pastShifts = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
    try {
        const res = await api.get('/shifts/me/history')
        pastShifts.value = res.data.content || res.data || []
    } catch { 
        pastShifts.value = []
    } finally { loading.value = false }
})

const formatTime = (secs: number): string => {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return `${h}h ${m}m`
}

const formatDate = (ts: string) => {
  return new Date(ts).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}
</script>

<template>
  <div class="p-2 space-y-4 max-w-4xl mx-auto">
    <div class="flex items-center justify-between px-2">
       <div>
          <h3 class="text-lg font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-50">Historial de Turnos</h3>
          <p class="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Tus últimas 5 jornadas</p>
       </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20 opacity-30">
       <Clock class="w-8 h-8 animate-spin mb-3" />
       <p class="text-[10px] font-black uppercase tracking-[0.2em]">Cargando historia...</p>
    </div>

    <!-- Empty -->
    <div v-else-if="pastShifts.length === 0" class="flex flex-col items-center justify-center py-20 opacity-20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2rem]">
       <Activity class="w-10 h-10 mb-4" />
       <p class="text-xs font-bold uppercase tracking-widest">No hay turnos registrados</p>
    </div>

    <!-- List -->
    <div v-else class="space-y-3">
       <Card v-for="s in pastShifts" :key="s.id" 
         class="overflow-hidden border-zinc-200 dark:border-zinc-800 hover:border-primary/30 transition-all group">
         <CardContent class="p-4 flex items-center justify-between gap-4">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center shrink-0">
                    <Calendar class="w-4 h-4 text-zinc-400 group-hover:text-primary transition-colors" />
                </div>
                <div>
                   <p class="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">{{ formatDate(s.startTime) }}</p>
                   <h4 class="text-sm font-black text-zinc-900 dark:text-zinc-100 leading-none mt-0.5">{{ formatTime(s.activeTimeSeconds || 0) }} trabajados</h4>
                </div>
            </div>

            <div class="flex items-center gap-6">
               <div class="text-right hidden sm:block">
                  <p class="text-[8px] font-black uppercase text-zinc-400 tracking-widest">Eficiencia</p>
                  <Badge variant="outline" class="mt-0.5 text-[10px] font-black">
                     {{ s.targetSeconds ? Math.min(100, Math.round((s.activeTimeSeconds / s.targetSeconds) * 100)) : '—' }}%
                  </Badge>
               </div>
               <ChevronRight class="w-4 h-4 text-zinc-300 dark:text-zinc-700" />
            </div>
         </CardContent>
       </Card>
    </div>
  </div>
</template>
