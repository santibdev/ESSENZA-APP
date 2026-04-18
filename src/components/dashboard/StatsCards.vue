<script setup lang="ts">
import {
  Target, Clock, AlertTriangle, Coffee, Info
} from 'lucide-vue-next'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const props = defineProps<{
  shiftCompliancePercent: number
  workTime: number
  idleTime: number
  breakTime: number
}>()

const formatTime = (secs: number): string => {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
</script>

<template>
  <TooltipProvider :delay-duration="100">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <Card v-for="k in [
        {
          l: 'Rendimiento',
          v: shiftCompliancePercent + '%',
          c: 'text-emerald-500',
          i: Target,
          sub: 'Nivel de actividad del turno',
          accent: 'bg-emerald-500'
        },
        {
          l: 'Tiempo Activo',
          v: formatTime(workTime),
          c: 'text-blue-500',
          i: Clock,
          sub: 'Tiempo total cronometrado',
          accent: 'bg-blue-500'
        },
        {
          l: 'Deuda AFK',
          v: formatTime(idleTime),
          c: 'text-amber-500',
          i: AlertTriangle,
          sub: 'Tiempo detectado en inactividad',
          accent: 'bg-amber-500'
        },
        {
          l: 'Break',
          v: formatTime(breakTime),
          c: breakTime > 1800 ? 'text-rose-500' : 'text-blue-400',
          i: Coffee,
          sub: 'Total de descansos (Máx 30min)',
          accent: breakTime > 1800 ? 'bg-rose-500' : 'bg-blue-600'
        }
      ]" :key="k.l" class="border-border/50 hover:border-border transition-colors relative overflow-hidden">
        <CardContent class="p-5">
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-1.5">
              <p class="text-[11px] font-black text-muted-foreground uppercase tracking-[0.15em]Leading-none">{{ k.l }}
              </p>
              <Tooltip>
                <TooltipTrigger>
                  <Info class="w-3 h-3 text-muted-foreground/30 hover:text-muted-foreground transition-colors" />
                </TooltipTrigger>
                <TooltipContent
                  class="text-[10px] font-bold uppercase tracking-wider bg-zinc-900 text-white border-zinc-800">
                  {{ k.sub }}
                </TooltipContent>
              </Tooltip>
            </div>
            <component :is="k.i" class="w-4 h-4" :class="k.c" />
          </div>
          <p class="text-3xl font-black tabular-nums leading-none tracking-tight">{{ k.v }}</p>
        </CardContent>
        <div class="absolute bottom-0 left-0 right-0 h-0.5 opacity-60" :class="k.accent" />
      </Card>
    </div>
  </TooltipProvider>
</template>
