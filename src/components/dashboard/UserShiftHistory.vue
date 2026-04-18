<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Clock, DollarSign, Calendar, ChevronDown, ChevronUp, Star, MessageSquare } from 'lucide-vue-next'
import api from '@/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'

const pastShifts = ref<any[]>([])
const loading = ref(true)
const expandedIds = ref<number[]>([])

onMounted(async () => {
  try {
    const res = await api.get('/shifts/me/history')
    pastShifts.value = res.data.content || res.data || []
  } catch { 
    pastShifts.value = []
  } finally { loading.value = false }
})

function toggleExpand(id: number) {
  const idx = expandedIds.value.indexOf(id)
  if (idx >= 0) expandedIds.value.splice(idx, 1)
  else expandedIds.value.push(id)
}

function parseJson(str: string | null | undefined) {
  if (!str) return []
  try { return JSON.parse(str) } catch { return [] }
}

function formatDateTime(ts: string) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function formatMoney(val: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(val)
}

// Separate general report from model reports
function getGeneralReport(shift: any) {
  return shift.reports?.find((r: any) => !r.ofModel) || null
}

function getModelReports(shift: any) {
  return shift.reports?.filter((r: any) => r.ofModel) || []
}
</script>

<template>
  <div class="space-y-6 max-w-4xl mx-auto">
    <div>
      <h2 class="text-2xl font-bold text-foreground">Historial de Turnos</h2>
      <p class="text-sm text-muted-foreground mt-1">Últimas 10 sesiones completadas</p>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>

    <div v-else-if="!pastShifts.length" class="flex flex-col items-center justify-center py-12 text-center">
      <Calendar class="w-12 h-12 text-muted-foreground/20 mb-4" />
      <p class="text-sm font-semibold text-muted-foreground/50">Sin historial</p>
      <p class="text-xs text-muted-foreground/30 mt-1">Completá tu primer turno para verlo aquí</p>
    </div>

    <div v-else class="space-y-4">
      <Card v-for="shift in pastShifts" :key="shift.id">
        <CardHeader>
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <CardTitle class="text-base flex items-center gap-2">
                <Calendar class="w-4 h-4 text-muted-foreground" />
                {{ formatDateTime(shift.startTime) }}
                <span class="text-muted-foreground">→</span>
                {{ formatDateTime(shift.endTime) }}
              </CardTitle>
              <CardDescription class="mt-1">
                <div class="flex items-center gap-3 flex-wrap">
                  <div class="flex items-center gap-1">
                    <Clock class="w-3 h-3" />
                    <span>{{ formatTime(shift.activeTimeSeconds || 0) }}</span>
                  </div>
                  <Separator orientation="vertical" class="h-4" />
                  <div class="flex items-center gap-1">
                    <DollarSign class="w-3 h-3" />
                    <span class="font-semibold">{{ formatMoney((shift.finalEarnings || 0) - (shift.initialEarnings || 0)) }}</span>
                  </div>
                  <Badge v-if="shift.isExtraHours" variant="secondary" class="text-[10px]">Extras</Badge>
                </div>
              </CardDescription>
            </div>
            <Button @click="toggleExpand(shift.id)" variant="ghost" size="icon" class="shrink-0">
              <component :is="expandedIds.includes(shift.id) ? ChevronUp : ChevronDown" class="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent v-if="expandedIds.includes(shift.id)" class="pt-0 space-y-4">
          <!-- General Report -->
          <div v-if="getGeneralReport(shift)?.observations" class="space-y-2">
            <div class="flex items-center gap-2">
              <MessageSquare class="w-4 h-4 text-muted-foreground" />
              <p class="text-sm font-semibold text-muted-foreground">Observaciones del Turno</p>
            </div>
            <div class="px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm text-foreground leading-relaxed">
              {{ getGeneralReport(shift).observations }}
            </div>
          </div>

          <Separator v-if="getGeneralReport(shift)?.observations && getModelReports(shift).length" />

          <!-- Model Reports -->
          <div v-if="getModelReports(shift).length" class="space-y-3">
            <p class="text-sm font-semibold text-muted-foreground">Reportes por Modelo</p>
            <div v-for="report in getModelReports(shift)" :key="report.id" class="space-y-2">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                  {{ report.ofModel?.name?.charAt(0).toUpperCase() || 'M' }}
                </div>
                <p class="text-sm font-bold text-foreground">{{ report.ofModel?.name || 'Modelo' }}</p>
                <Badge v-if="report.earnings > 0" variant="secondary" class="text-[10px] ml-auto">
                  {{ formatMoney(report.earnings) }}
                </Badge>
              </div>

              <!-- Observations -->
              <div v-if="parseJson(report.soldContentJson).length" class="pl-8 space-y-1">
                <p v-for="(note, i) in parseJson(report.soldContentJson)" :key="i"
                  class="text-sm text-foreground leading-snug pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-primary">
                  {{ note }}
                </p>
              </div>

              <!-- Spenders -->
              <div v-if="parseJson(report.spendersJson).length" class="pl-8 space-y-1.5">
                <div v-for="(sp, i) in parseJson(report.spendersJson)" :key="i"
                  class="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                  <div class="flex items-center gap-2 flex-1 min-w-0">
                    <Star class="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <div class="flex-1 min-w-0">
                      <p class="text-xs font-semibold text-foreground truncate">{{ sp.name || 'Sin nombre' }}</p>
                      <p v-if="sp.username" class="text-[10px] text-muted-foreground truncate">{{ sp.username.startsWith('@') ? sp.username : '@' + sp.username }}</p>
                    </div>
                  </div>
                  <span v-if="sp.amount" class="text-xs font-black text-amber-600 dark:text-amber-400 tabular-nums shrink-0">${{ sp.amount }}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>