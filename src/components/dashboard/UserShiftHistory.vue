<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Clock, Activity, DollarSign, Users, MessageSquare, ArrowUpRight, TrendingUp } from 'lucide-vue-next'
import api from '@/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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

// --- Calculations ---
const totalEarnings = computed(() => {
  return pastShifts.value.reduce((acc, s) => acc + ((s.finalEarnings || 0) - (s.initialEarnings || 0)), 0)
})

const avgCompliance = computed(() => {
  if (pastShifts.value.length === 0) return 0
  const sum = pastShifts.value.reduce((acc, s) => {
    const compliance = s.targetSeconds ? (s.activeTimeSeconds / s.targetSeconds) * 100 : 0
    return acc + Math.min(100, compliance)
  }, 0)
  return Math.round(sum / pastShifts.value.length)
})

const totalHours = computed(() => {
  const totalSecs = pastShifts.value.reduce((acc, s) => acc + (s.activeTimeSeconds || 0), 0)
  return Math.floor(totalSecs / 3600)
})

// --- Formatters ---
const formatTime = (secs: number): string => {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const formatDate = (ts: string) => {
  return new Date(ts).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short'
  })
}

const formatMoney = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(val)
}
</script>

<template>
  <div class="p-2 space-y-8 max-w-[1200px] mx-auto pb-10">
    
    <!-- Header Metrics -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card class="bg-card/50 backdrop-blur-sm border-border/50 relative overflow-hidden group">
        <div class="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardContent class="p-5 flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
            <DollarSign class="w-6 h-6" />
          </div>
          <div>
            <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Ganancia Total</p>
            <h4 class="text-xl font-black text-foreground tracking-tighter">{{ formatMoney(totalEarnings) }}</h4>
          </div>
        </CardContent>
      </Card>

      <Card class="bg-card/50 backdrop-blur-sm border-border/50 relative overflow-hidden group">
        <div class="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardContent class="p-5 flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
            <Clock class="w-6 h-6" />
          </div>
          <div>
            <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Horas Totales</p>
            <h4 class="text-xl font-black text-foreground tracking-tighter">{{ totalHours }} Horas</h4>
          </div>
        </CardContent>
      </Card>

      <Card class="bg-card/50 backdrop-blur-sm border-border/50 relative overflow-hidden group">
        <div class="absolute inset-0 bg-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardContent class="p-5 flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-500 shrink-0">
            <TrendingUp class="w-6 h-6" />
          </div>
          <div>
            <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Productividad</p>
            <h4 class="text-xl font-black text-foreground tracking-tighter">{{ avgCompliance }}% Avg</h4>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Main History Table -->
    <div class="rounded-[2rem] border border-border bg-card/30 backdrop-blur-md overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-zinc-100/50 dark:bg-zinc-900/50 border-b border-border">
              <th class="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-zinc-500">Fecha</th>
              <th class="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-zinc-500">Modelos</th>
              <th class="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-zinc-500">Duración</th>
              <th class="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-zinc-500">Cierre</th>
              <th class="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-zinc-500 shrink-0 min-w-[50px]"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border/50">
            <tr v-for="s in pastShifts" :key="s.id" class="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors group">
              <td class="px-6 py-5">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center font-black text-sm uppercase shadow-sm">
                    {{ formatDate(s.startTime).split(' ')[0] }}
                  </div>
                  <div>
                    <p class="text-xs font-black text-foreground leading-none">{{ formatDate(s.startTime).split(' ')[1] }}</p>
                    <p class="text-[9px] font-bold text-muted-foreground mt-1">{{ s.isExtraHours ? 'Extra' : 'Standard' }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-5">
                <div class="flex flex-wrap gap-1 max-w-[200px]">
                  <template v-if="s.assignedModels?.length">
                    <Badge v-for="m in s.assignedModels" :key="m.id" 
                      class="px-1.5 py-0 text-[8px] font-black uppercase tracking-tighter bg-zinc-100 dark:bg-zinc-800 text-foreground border-zinc-200 dark:border-zinc-700">
                      {{ m.alias || m.name }}
                    </Badge>
                  </template>
                  <span v-else class="text-[9px] text-muted-foreground/50 italic font-medium">Auto-asignado</span>
                </div>
              </td>
              <td class="px-6 py-5 text-sm font-black tabular-nums text-foreground opacity-80">
                {{ formatTime(s.activeTimeSeconds || 0) }}
              </td>
              <td class="px-6 py-5 text-right">
                <p :class="['text-sm font-black tabular-nums tracking-tighter', (s.finalEarnings - s.initialEarnings) >= 0 ? 'text-emerald-500' : 'text-rose-500']">
                  {{ formatMoney((s.finalEarnings || 0) - (s.initialEarnings || 0)) }}
                </p>
                <p class="text-[8px] font-bold text-muted-foreground uppercase opacity-40">Neto Session</p>
              </td>
              <td class="px-6 py-5">
                <div class="flex justify-center">
                   <TooltipProvider :delay-duration="100">
                    <Tooltip>
                      <TooltipTrigger>
                        <div class="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-muted-foreground hover:text-foreground">
                          <MessageSquare class="w-3.5 h-3.5" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" class="max-w-[300px] p-3 rounded-xl bg-zinc-900 text-white border-zinc-800 shadow-2xl">
                        <p class="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2">Observaciones del Turno</p>
                        <p class="text-[11px] font-medium leading-relaxed italic">
                          "{{ s.observations || 'Sin comentarios registrados.' }}"
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Footer Info -->
      <div v-if="pastShifts.length > 0" class="px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between border-t border-border">
         <p class="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Mostrando últimas sesiones</p>
         <div class="flex items-center gap-1.5 opacity-50">
           <Separator orientation="vertical" class="h-3 mx-2" />
           <p class="text-[9px] font-black uppercase text-foreground">Essenza High-Performance Data</p>
         </div>
      </div>
      
      <div v-else class="py-20 flex flex-col items-center justify-center opacity-30">
        <Activity class="w-10 h-10 mb-4" />
        <p class="text-[10px] font-black uppercase tracking-[0.2em]">Sin historial de datos</p>
      </div>
    </div>

  </div>
</template>

