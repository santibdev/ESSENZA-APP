<script setup lang="ts">
import { Clock, Star, DollarSign, AlertCircle } from 'lucide-vue-next'

const props = defineProps<{
  model: { name: string; alias?: string }
  entries: any[]
}>()

function parseJson(str: string | null | undefined) {
  if (!str) return []
  try { return JSON.parse(str) } catch { return [] }
}

function fmtDateTime(ts: string) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function authorInitial(name: string) {
  return (name || '?').charAt(0).toUpperCase()
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Model Header -->
    <div class="pb-4 mb-4 border-b border-border">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black shadow-sm">
          {{ model.name.charAt(0).toUpperCase() }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-base font-bold text-foreground leading-none">{{ model.name }}</p>
          <p v-if="model.alias" class="text-xs text-muted-foreground mt-1">{{ model.alias }}</p>
        </div>
        <div class="text-xs font-semibold text-muted-foreground">{{ entries.length }}</div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!entries.length" class="flex-1 flex flex-col items-center justify-center gap-3 text-center py-12">
      <AlertCircle class="w-12 h-12 text-muted-foreground/20" />
      <p class="text-sm font-semibold text-muted-foreground/50">Sin historial</p>
      <p class="text-xs text-muted-foreground/30 max-w-[200px]">Los reportes de turno aparecerán aquí</p>
    </div>

    <!-- Timeline -->
    <div v-else class="flex-1 overflow-y-auto space-y-6 pr-2">
      <div v-for="(entry, idx) in entries.slice(0, 10)" :key="entry.id" class="relative">
        <!-- Timeline line -->
        <div v-if="idx < entries.slice(0, 10).length - 1" 
          class="absolute left-[15px] top-10 bottom-0 w-0.5 bg-border" />

        <div class="flex gap-3">
          <!-- Avatar -->
          <div class="relative z-10 w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center shrink-0 ring-4 ring-background">
            {{ authorInitial(entry.authorName) }}
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0 pb-2">
            <!-- Header -->
            <div class="mb-2">
              <p class="text-sm font-bold text-foreground leading-none">{{ entry.authorName || 'Operador' }}</p>
              <div class="flex items-center gap-1.5 mt-1">
                <Clock class="w-3.5 h-3.5 text-muted-foreground" />
                <p class="text-xs text-muted-foreground">{{ fmtDateTime(entry.timestamp) }}</p>
              </div>
            </div>

            <!-- Observations -->
            <div v-if="parseJson(entry.soldContentJson).length" class="mb-3 space-y-1.5">
              <p v-for="(note, i) in parseJson(entry.soldContentJson)" :key="i"
                class="text-sm text-foreground leading-relaxed pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-primary before:font-bold">
                {{ note }}
              </p>
            </div>

            <!-- Spenders -->
            <div v-if="parseJson(entry.spendersJson).length" class="space-y-2">
              <div v-for="(sp, i) in parseJson(entry.spendersJson)" :key="i"
                class="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <Star class="w-4 h-4 text-amber-400 shrink-0" />
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-foreground truncate">{{ sp.name || 'Sin nombre' }}</p>
                    <p v-if="sp.username" class="text-xs text-muted-foreground truncate">{{ sp.username.startsWith('@') ? sp.username : '@' + sp.username }}</p>
                  </div>
                </div>
                <span v-if="sp.amount" class="text-sm font-black text-amber-600 dark:text-amber-400 tabular-nums shrink-0">${{ sp.amount }}</span>
              </div>
            </div>

            <!-- Free text -->
            <div v-if="entry.message && !parseJson(entry.soldContentJson).length && !parseJson(entry.spendersJson).length"
              class="px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground leading-relaxed">
              {{ entry.message }}
            </div>
          </div>
        </div>
      </div>

      <!-- More indicator -->
      <div v-if="entries.length > 10" class="text-center py-4">
        <p class="text-xs text-muted-foreground/50">Mostrando últimos 10 turnos</p>
      </div>
    </div>
  </div>
</template>