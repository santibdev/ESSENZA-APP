<script setup lang="ts">
import { computed } from 'vue'
import { Clock, Star, TrendingUp, DollarSign, AlertCircle, ChevronRight, User } from 'lucide-vue-next'

const props = defineProps<{
  model: { id: number; name: string; alias?: string; instagram?: string; telegram?: string }
  entries: any[]   // LogbookEntry[]
}>()

const latest = computed(() => props.entries?.[0] ?? null)
const older = computed(() => props.entries?.slice(1) ?? [])

function parseJson(str: string | null | undefined) {
  if (!str) return []
  try { return JSON.parse(str) } catch { return [] }
}

function fmtTime(ts: string) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function authorInitial(name: string) {
  return (name || '?').charAt(0).toUpperCase()
}
</script>

<template>
  <div class="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
    <!-- Model Header -->
    <div class="flex items-center justify-between px-5 py-4 bg-muted/30 border-b border-border">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md">
          {{ model.name.charAt(0).toUpperCase() }}
        </div>
        <div>
          <p class="text-[12px] font-black uppercase tracking-tight text-foreground leading-none">{{ model.name }}</p>
          <p v-if="model.alias" class="text-[9px] font-bold text-muted-foreground/50 mt-0.5 uppercase tracking-wider">{{ model.alias }}</p>
          <div class="flex items-center gap-2 mt-1">
            <a v-if="model.instagram" :href="`https://instagram.com/${model.instagram}`" target="_blank"
              class="text-[8px] font-black text-pink-500/70 hover:text-pink-500 uppercase tracking-widest transition-colors">
              IG @{{ model.instagram }}
            </a>
            <span v-if="model.instagram && model.telegram" class="text-zinc-200 dark:text-zinc-700">·</span>
            <a v-if="model.telegram" :href="model.telegram" target="_blank"
              class="text-[8px] font-black text-blue-500/70 hover:text-blue-500 uppercase tracking-widest transition-colors">
              TG
            </a>
          </div>
        </div>
      </div>

      <div v-if="!latest" class="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[8px] font-black uppercase text-muted-foreground/40 tracking-widest">
        Sin notas
      </div>
      <div v-else class="flex items-center gap-1.5 text-[8px] font-bold text-muted-foreground/40 uppercase tracking-widest">
        <Clock class="w-3 h-3" />
        {{ fmtTime(latest.timestamp) }}
      </div>
    </div>

    <!-- Latest Entry (most recent shift handoff) -->
    <div v-if="!latest" class="px-5 py-8 flex flex-col items-center justify-center gap-2 text-center">
      <AlertCircle class="w-6 h-6 text-muted-foreground/20" />
      <p class="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30">Sin historial de turnos</p>
      <p class="text-[9px] text-muted-foreground/20">El primer operador que trabaje con esta modelo dejará sus notas aquí.</p>
    </div>

    <div v-else class="divide-y divide-border/40">
      <!-- Latest shift note -->
      <div class="px-5 py-4 space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-full bg-primary/10 text-primary text-[9px] font-black flex items-center justify-center">
              {{ authorInitial(latest.authorName) }}
            </div>
            <span class="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wide">{{ latest.authorName || 'Operador' }}</span>
          </div>
          <span class="text-[8px] font-bold text-muted-foreground/30 uppercase tracking-widest">Último turno</span>
        </div>

        <!-- Content sold -->
        <div v-if="parseJson(latest.soldContentJson).length" class="space-y-1.5">
          <p class="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 flex items-center gap-1.5">
            <TrendingUp class="w-3 h-3 text-emerald-500" /> Contenido más vendido
          </p>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="(item, i) in parseJson(latest.soldContentJson)" :key="i"
              class="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[9px] font-bold border border-emerald-200/50 dark:border-emerald-900/50">
              {{ item }}
            </span>
          </div>
        </div>

        <!-- Top spenders -->
        <div v-if="parseJson(latest.spendersJson).length" class="space-y-1.5">
          <p class="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 flex items-center gap-1.5">
            <DollarSign class="w-3 h-3 text-amber-500" /> Top Gastadores
          </p>
          <div class="space-y-1">
            <div v-for="(sp, i) in parseJson(latest.spendersJson)" :key="i"
              class="flex items-center justify-between px-3 py-1.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
              <div class="flex items-center gap-2">
                <Star class="w-3 h-3 text-amber-400 shrink-0" />
                <span class="text-[10px] font-bold text-foreground">{{ sp.name || 'Sin nombre' }}</span>
                <span v-if="sp.username" class="text-[9px] text-muted-foreground/50 font-medium">{{ sp.username.startsWith('@') ? sp.username : '@' + sp.username }}</span>
              </div>
              <span v-if="sp.amount" class="text-[11px] font-black text-amber-600 dark:text-amber-400 tabular-nums">${{ sp.amount }}</span>
            </div>
          </div>
        </div>

        <!-- Free text message fallback -->
        <div v-if="latest.message && !parseJson(latest.soldContentJson).length && !parseJson(latest.spendersJson).length"
          class="px-3 py-2 rounded-lg bg-muted/30 border border-border/50 text-[11px] text-muted-foreground italic leading-relaxed">
          "{{ latest.message }}"
        </div>
      </div>

      <!-- Older entries (collapsed, just timestamps) -->
      <div v-if="older.length" class="px-5 py-3">
        <p class="text-[8px] font-black uppercase tracking-widest text-muted-foreground/30 mb-2">Turnos anteriores</p>
        <div class="space-y-1">
          <div v-for="entry in older" :key="entry.id"
            class="flex items-center justify-between text-[9px] text-muted-foreground/40">
            <div class="flex items-center gap-1.5">
              <User class="w-3 h-3" />
              <span class="font-bold">{{ entry.authorName || '—' }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-muted-foreground/25">{{ parseJson(entry.soldContentJson).slice(0, 1).join('') }}</span>
              <Clock class="w-2.5 h-2.5" />
              <span>{{ fmtTime(entry.timestamp) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
