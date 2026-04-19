<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  Clock, DollarSign, Calendar, ChevronDown, ChevronUp,
  Star, MessageSquare, TrendingUp, Code2, Timer, Zap
} from 'lucide-vue-next'
import api from '@/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

const pastShifts = ref<any[]>([])
const loading = ref(true)
const rawJson = ref<string>('')
const showRaw = ref(false)

onMounted(async () => {
  try {
    const res = await api.get('/shifts/me/history')
    const data = res.data.content || res.data || []
    pastShifts.value = data
    rawJson.value = JSON.stringify(res.data, null, 2)
  } catch (e) {
    pastShifts.value = []
    rawJson.value = String(e)
  } finally {
    loading.value = false
  }
})

function parseJson(str: string | null | undefined) {
  if (!str) return []
  try { return JSON.parse(str) } catch { return [] }
}

function formatDateTime(ts: string) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('es-AR', {
    weekday: 'short', day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatDuration(start: string, end: string): string {
  if (!start || !end) return '—'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const totalMins = Math.floor(ms / 60000)
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function formatMoney(val: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0
  }).format(val)
}

/** % of total shift time that was active (vs. idle) */
function efficiencyPct(shift: any): number {
  if (!shift.startTime || !shift.endTime || !shift.activeTimeSeconds) return 0
  const totalSecs = (new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime()) / 1000
  if (totalSecs <= 0) return 0
  return Math.min(100, Math.round((shift.activeTimeSeconds / totalSecs) * 100))
}

function earnings(shift: any): number {
  return (shift.finalEarnings || 0) - (shift.initialEarnings || 0)
}

function getGeneralReport(shift: any) {
  return shift.reports?.find((r: any) => !r.ofModel) || null
}

function getModelReports(shift: any) {
  return shift.reports?.filter((r: any) => r.ofModel) || []
}

function totalSpendersCount(shift: any): number {
  return getModelReports(shift).reduce((acc: number, r: any) =>
    acc + parseJson(r.spendersJson).length, 0)
}

function totalContentCount(shift: any): number {
  return getModelReports(shift).reduce((acc: number, r: any) =>
    acc + parseJson(r.soldContentJson).length, 0)
}
</script>

<template>
  <div class="space-y-6 max-w-4xl mx-auto">

    <!-- Header -->
    <div class="flex items-end justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-foreground">Historial de Turnos</h2>
        <p class="text-sm text-muted-foreground mt-1">Últimas sesiones completadas</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        class="gap-2 font-mono text-xs"
        @click="showRaw = !showRaw"
      >
        <Code2 class="w-3.5 h-3.5" />
        {{ showRaw ? 'Ocultar' : 'Ver' }} JSON
      </Button>
    </div>

    <!-- Raw JSON debug block -->
    <Collapsible :open="showRaw" @update:open="showRaw = $event">
      <CollapsibleContent>
        <Card class="border-dashed border-amber-500/40 bg-amber-950/10">
          <CardHeader class="pb-2">
            <CardTitle class="text-xs font-mono text-amber-400 flex items-center gap-2">
              <Code2 class="w-3.5 h-3.5" />
              Raw API Response — GET /shifts/me/history
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre class="text-[11px] font-mono text-amber-300/80 overflow-x-auto whitespace-pre max-h-80 leading-relaxed">{{ rawJson || 'Cargando…' }}</pre>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Empty -->
    <div v-else-if="!pastShifts.length" class="flex flex-col items-center justify-center py-12 text-center">
      <Calendar class="w-12 h-12 text-muted-foreground/20 mb-4" />
      <p class="text-sm font-semibold text-muted-foreground/50">Sin historial</p>
      <p class="text-xs text-muted-foreground/30 mt-1">Completá tu primer turno para verlo aquí</p>
    </div>

    <!-- Shift list -->
    <div v-else class="space-y-3">
      <Collapsible
        v-for="shift in pastShifts"
        :key="shift.id"
        v-slot="{ open }"
      >
        <Card :class="open ? 'ring-1 ring-primary/30' : ''">

          <!-- Collapsed header — always visible -->
          <CardHeader class="pb-3">
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 min-w-0 space-y-2">

                <!-- Date range -->
                <div class="flex items-center gap-2 flex-wrap">
                  <Calendar class="w-4 h-4 text-muted-foreground shrink-0" />
                  <span class="text-sm font-semibold text-foreground">
                    {{ formatDateTime(shift.startTime) }}
                  </span>
                  <span class="text-muted-foreground text-xs">→</span>
                  <span class="text-sm font-semibold text-foreground">
                    {{ formatDateTime(shift.endTime) }}
                  </span>
                  <Badge v-if="shift.isExtraHours" variant="secondary" class="text-[10px]">Extras</Badge>
                </div>

                <!-- Quick stats row -->
                <div class="flex items-center gap-4 flex-wrap">
                  <!-- Duration -->
                  <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Timer class="w-3.5 h-3.5" />
                    <span>{{ formatDuration(shift.startTime, shift.endTime) }}</span>
                    <span class="text-muted-foreground/40">total</span>
                  </div>

                  <!-- Active time -->
                  <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock class="w-3.5 h-3.5" />
                    <span>{{ formatTime(shift.activeTimeSeconds || 0) }}</span>
                    <span class="text-muted-foreground/40">activo</span>
                  </div>

                  <!-- Earnings -->
                  <div class="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <DollarSign class="w-3.5 h-3.5" />
                    <span>{{ formatMoney(earnings(shift)) }}</span>
                  </div>

                  <!-- Models count -->
                  <div v-if="getModelReports(shift).length" class="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Zap class="w-3.5 h-3.5" />
                    <span>{{ getModelReports(shift).length }} modelo{{ getModelReports(shift).length > 1 ? 's' : '' }}</span>
                  </div>

                  <!-- Spenders count -->
                  <div v-if="totalSpendersCount(shift)" class="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Star class="w-3.5 h-3.5 text-amber-400" />
                    <span>{{ totalSpendersCount(shift) }} spender{{ totalSpendersCount(shift) > 1 ? 's' : '' }}</span>
                  </div>
                </div>

                <!-- Efficiency bar -->
                <div v-if="efficiencyPct(shift) > 0" class="space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] text-muted-foreground flex items-center gap-1">
                      <TrendingUp class="w-3 h-3" />
                      Eficiencia activa
                    </span>
                    <span class="text-[10px] font-mono font-bold" :class="efficiencyPct(shift) >= 70 ? 'text-emerald-500' : efficiencyPct(shift) >= 40 ? 'text-amber-500' : 'text-rose-500'">
                      {{ efficiencyPct(shift) }}%
                    </span>
                  </div>
                  <Progress :model-value="efficiencyPct(shift)" class="h-1.5" />
                </div>

              </div>

              <!-- Collapsible trigger -->
              <CollapsibleTrigger as-child>
                <Button variant="ghost" size="icon" class="shrink-0">
                  <ChevronUp v-if="open" class="w-4 h-4" />
                  <ChevronDown v-else class="w-4 h-4" />
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>

          <!-- Expanded content -->
          <CollapsibleContent>
            <CardContent class="pt-0 space-y-5">
              <Separator />

              <!-- Stats grid -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div class="rounded-lg bg-muted/40 border border-border px-3 py-2.5 space-y-0.5">
                  <p class="text-[10px] uppercase tracking-wide text-muted-foreground">Duración total</p>
                  <p class="text-sm font-bold text-foreground">{{ formatDuration(shift.startTime, shift.endTime) }}</p>
                </div>
                <div class="rounded-lg bg-muted/40 border border-border px-3 py-2.5 space-y-0.5">
                  <p class="text-[10px] uppercase tracking-wide text-muted-foreground">Tiempo activo</p>
                  <p class="text-sm font-bold text-foreground">{{ formatTime(shift.activeTimeSeconds || 0) }}</p>
                </div>
                <div class="rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 px-3 py-2.5 space-y-0.5">
                  <p class="text-[10px] uppercase tracking-wide text-muted-foreground">Ganancias</p>
                  <p class="text-sm font-bold text-emerald-600 dark:text-emerald-400">{{ formatMoney(earnings(shift)) }}</p>
                </div>
                <div class="rounded-lg bg-muted/40 border border-border px-3 py-2.5 space-y-0.5">
                  <p class="text-[10px] uppercase tracking-wide text-muted-foreground">Contenido vendido</p>
                  <p class="text-sm font-bold text-foreground">{{ totalContentCount(shift) }} ítems</p>
                </div>
              </div>

              <!-- General Report observations -->
              <div v-if="getGeneralReport(shift)?.observations" class="space-y-2">
                <div class="flex items-center gap-2">
                  <MessageSquare class="w-4 h-4 text-muted-foreground" />
                  <p class="text-sm font-semibold text-muted-foreground">Observaciones del Turno</p>
                </div>
                <div class="px-3 py-2.5 rounded-lg bg-muted/50 border border-border text-sm text-foreground leading-relaxed">
                  {{ getGeneralReport(shift).observations }}
                </div>
              </div>

              <!-- Model reports -->
              <div v-if="getModelReports(shift).length" class="space-y-4">
                <p class="text-sm font-semibold text-muted-foreground">Reportes por Modelo</p>

                <div v-for="report in getModelReports(shift)" :key="report.id" class="rounded-lg border border-border bg-muted/20 overflow-hidden">
                  <!-- Model header -->
                  <div class="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b border-border/50">
                    <div class="w-7 h-7 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {{ report.ofModel?.name?.charAt(0).toUpperCase() || 'M' }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-bold text-foreground">{{ report.ofModel?.name || 'Modelo' }}</p>
                      <p v-if="report.ofModel?.platform" class="text-[10px] text-muted-foreground">{{ report.ofModel.platform }}</p>
                    </div>
                    <Badge v-if="report.earnings > 0" variant="secondary" class="text-[10px] shrink-0">
                      {{ formatMoney(report.earnings) }}
                    </Badge>
                  </div>

                  <div class="px-4 py-3 space-y-3">
                    <!-- Sold content -->
                    <div v-if="parseJson(report.soldContentJson).length" class="space-y-1">
                      <p class="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Contenido vendido</p>
                      <div class="space-y-1">
                        <p
                          v-for="(note, i) in parseJson(report.soldContentJson)"
                          :key="i"
                          class="text-sm text-foreground leading-snug pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-primary"
                        >
                          {{ note }}
                        </p>
                      </div>
                    </div>

                    <!-- Spenders -->
                    <div v-if="parseJson(report.spendersJson).length" class="space-y-1.5">
                      <p class="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Spenders</p>
                      <div
                        v-for="(sp, i) in parseJson(report.spendersJson)"
                        :key="i"
                        class="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30"
                      >
                        <div class="flex items-center gap-2 flex-1 min-w-0">
                          <Star class="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <div class="flex-1 min-w-0">
                            <p class="text-xs font-semibold text-foreground truncate">{{ sp.name || 'Sin nombre' }}</p>
                            <p v-if="sp.username" class="text-[10px] text-muted-foreground truncate">
                              {{ sp.username.startsWith('@') ? sp.username : '@' + sp.username }}
                            </p>
                          </div>
                        </div>
                        <span v-if="sp.amount" class="text-xs font-black text-amber-600 dark:text-amber-400 tabular-nums shrink-0">
                          ${{ sp.amount }}
                        </span>
                      </div>
                    </div>

                    <!-- Fallback if no detail -->
                    <p v-if="!parseJson(report.soldContentJson).length && !parseJson(report.spendersJson).length" class="text-xs text-muted-foreground/50 italic">
                      Sin detalle registrado para este modelo.
                    </p>
                  </div>
                </div>
              </div>

            </CardContent>
          </CollapsibleContent>

        </Card>
      </Collapsible>
    </div>

  </div>
</template>