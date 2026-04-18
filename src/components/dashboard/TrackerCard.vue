<script setup lang="ts">
import { Coffee, Play, Timer, Pause, Zap, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ref, watch, computed } from 'vue'

const props = defineProps<{
  effectiveWorkSeconds: number
  isWorking: boolean
  isPaused: boolean
  statusLabel: string
  statusDot: string
}>()

const emit = defineEmits<{
  (e: 'toggleSidebar'): void
  (e: 'startShift', isExtra: boolean): void
  (e: 'toggleBreak'): void
  (e: 'endShift'): void
}>()

const displayDigits = ref(['0', '0', ':', '0', '0', ':', '0', '0'])
const animatingIndex = ref<number[]>([])

const formatTime = (secs: number): string => {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

watch(() => props.effectiveWorkSeconds, (newVal) => {
  const newDigits = formatTime(newVal).split('')
  const changed: number[] = []
  newDigits.forEach((d, i) => { if (d !== displayDigits.value[i]) changed.push(i) })
  animatingIndex.value = changed
  displayDigits.value = newDigits
  setTimeout(() => { animatingIndex.value = [] }, 350)
}, { immediate: true })

const progressPercent = computed(() =>
  Math.min((props.effectiveWorkSeconds / 28800) * 100, 100)
)

const hoursWorked = computed(() =>
  (props.effectiveWorkSeconds / 3600).toFixed(1)
)
</script>

<template>
  <div class="lg:col-span-2 rounded-xl border border-border bg-card p-6 flex flex-col gap-6">

    <!-- Header row -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div
          class="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center transition-colors duration-300">
          <Timer class="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p class="text-sm font-medium text-foreground leading-none">Tiempo efectivo</p>
          <p class="text-xs text-muted-foreground mt-0.5">Jornada de hoy</p>
        </div>
      </div>

      <Badge :variant="isWorking && !isPaused ? 'default' : 'secondary'" class="gap-1.5 text-xs font-medium">
        <span :class="[
          'w-1.5 h-1.5 rounded-full',
          isWorking && !isPaused ? 'bg-emerald-400 animate-pulse' :
            isPaused ? 'bg-amber-400' :
              'bg-muted-foreground/50'
        ]" />
        {{ statusLabel }}
      </Badge>
    </div>

    <!-- Timer -->
    <div class="flex flex-col items-center gap-3 py-4">
      <div class="flex items-center font-mono font-bold tabular-nums tracking-tight leading-none select-none"
        style="font-size: clamp(3.5rem, 10vw, 5.5rem);">
        <span v-for="(digit, i) in displayDigits" :key="i" :class="[
          'inline-block transition-colors duration-500',
          digit === ':'
            ? 'text-muted-foreground/20 mx-1'
            : !isWorking ? 'text-muted-foreground/40' :
              isPaused ? 'text-primary glow-primary' :
                'text-primary glow-primary',
          animatingIndex.includes(i) ? 'digit-flip' : ''
        ]">{{ digit }}</span>
      </div>
    </div>

    <!-- Progress bar -->
    <div class="space-y-1.5">
      <div class="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div class="h-full rounded-full transition-all duration-1000 ease-out" :class="!isWorking ? 'bg-muted-foreground/30' :
          isPaused ? 'bg-amber-500' :
            'bg-emerald-500'
          " :style="{ width: `${progressPercent}%` }" />
      </div>
      <div class="flex justify-between text-[10px] text-muted-foreground tabular-nums">
        <span>0h</span>
        <span>2h</span>
        <span>4h</span>
        <span>6h</span>
        <span>8h</span>
      </div>
    </div>

    <!-- Separator -->
    <div class="border-t border-border" />

    <!-- Actions -->
    <div class="flex items-center justify-between gap-3">
      <template v-if="isWorking">
        <p class="text-xs text-muted-foreground flex items-center gap-2">
          <span :class="['w-1.5 h-1.5 rounded-full', isPaused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse']" />
          {{ isPaused ? 'En break · pausado' : 'Turno activo · corriendo' }}
        </p>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" class="gap-2 h-9" @click="emit('toggleBreak')">
            <component :is="isPaused ? Play : Coffee" class="w-3.5 h-3.5" />
            {{ isPaused ? 'Retomar' : 'Break' }}
          </Button>
          <Button variant="destructive" size="sm" class="gap-2 h-9 text-white" @click="emit('endShift')">
            <X class="w-3.5 h-3.5" />
            Detener
          </Button>
        </div>
      </template>

      <template v-else>
        <div class="flex flex-col items-start gap-1">
          <p class="text-xs text-muted-foreground font-medium">Sin turno activo</p>
          <p class="text-[10px] text-muted-foreground/50">Iniciá para comenzar a trackear</p>
        </div>
        <div class="flex items-center gap-2">
          <Button size="sm" variant="outline" class="gap-2 h-9" @click="emit('startShift', true)">
            <Zap class="w-3.5 h-3.5" />
            Extras
          </Button>
          <Button size="sm" class="gap-2 h-9" @click="emit('startShift', false)">
            <Play class="w-3.5 h-3.5" />
            Iniciar jornada
          </Button>
        </div>
      </template>
    </div>

  </div>
</template>

<style scoped>
@keyframes digitFlip {
  0% {
    opacity: 0;
    transform: translateY(-25%) scaleY(0.7);
    filter: blur(3px);
  }

  65% {
    opacity: 1;
    transform: translateY(3%) scaleY(1.04);
    filter: blur(0);
  }

  100% {
    opacity: 1;
    transform: translateY(0) scaleY(1);
    filter: blur(0);
  }
}

.digit-flip {
  animation: digitFlip 0.32s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
</style>