<script setup lang="ts">
import { Clock, Star, DollarSign, AlertCircle, MessageSquare, ShoppingBag, ArrowRight } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

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

function fmtDateOnly(ts: string) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' })
}

function fmtTimeOnly(ts: string) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function authorInitial(name: string) {
  return (name || '?').charAt(0).toUpperCase()
}

function getGradient(idx: number) {
  const gradients = [
    'from-violet-500 to-indigo-600',
    'from-rose-500 to-pink-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-sky-500 to-blue-600',
  ]
  return gradients[idx % gradients.length]
}
</script>

<template>
  <div class="rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
    <!-- Model Header -->
    <div class="px-5 py-4 bg-gradient-to-r from-primary/5 to-transparent border-b border-border/50">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-violet-500/20">
          {{ model.name.charAt(0).toUpperCase() }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-black text-foreground leading-none tracking-tight">{{ model.name }}</p>
          <p v-if="model.alias" class="text-[11px] text-muted-foreground mt-1 font-medium">{{ model.alias }}</p>
        </div>
        <Badge variant="secondary" class="text-[10px] font-black tabular-nums px-2.5 py-1">
          {{ entries.length }} {{ entries.length === 1 ? 'relevo' : 'relevos' }}
        </Badge>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!entries.length" class="flex flex-col items-center justify-center gap-3 text-center py-14 px-6">
      <div class="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center">
        <MessageSquare class="w-7 h-7 text-muted-foreground/20" />
      </div>
      <div>
        <p class="text-sm font-bold text-muted-foreground/50">Sin historial</p>
        <p class="text-[11px] text-muted-foreground/30 mt-1">Los reportes de turno aparecerán aquí</p>
      </div>
    </div>

    <!-- Timeline entries -->
    <div v-else class="divide-y divide-border/50">
      <div
        v-for="(entry, idx) in entries.slice(0, 8)"
        :key="entry.id"
        class="px-5 py-4 hover:bg-muted/30 transition-colors duration-200"
      >
        <!-- Entry header -->
        <div class="flex items-center gap-3 mb-3">
          <div
            class="w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-xs font-black shrink-0 shadow-sm"
            :class="getGradient(idx)"
          >
            {{ authorInitial(entry.authorName) }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-bold text-foreground leading-none">{{ entry.authorName || 'Operador' }}</p>
            <p class="text-[10px] text-muted-foreground mt-0.5 font-medium capitalize">{{ fmtDateOnly(entry.timestamp) }} · {{ fmtTimeOnly(entry.timestamp) }}</p>
          </div>
        </div>

        <!-- Message / handoff notes -->
        <div v-if="entry.message" class="mb-3 ml-11">
          <p class="text-[13px] text-foreground/80 leading-relaxed whitespace-pre-wrap">{{ entry.message }}</p>
        </div>

        <!-- Content items -->
        <div v-if="parseJson(entry.soldContentJson).length" class="ml-11 mb-3">
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="(tag, i) in parseJson(entry.soldContentJson)"
              :key="i"
              class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/5 text-primary border border-primary/10"
            >
              <ShoppingBag class="w-2.5 h-2.5" />
              {{ tag }}
            </span>
          </div>
        </div>

        <!-- Spenders -->
        <div v-if="parseJson(entry.spendersJson).length" class="ml-11 space-y-1.5">
          <div
            v-for="(sp, i) in parseJson(entry.spendersJson)"
            :key="i"
            class="flex items-center gap-3 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10"
          >
            <Star class="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <div class="flex-1 min-w-0">
              <p class="text-xs font-bold text-foreground truncate">{{ sp.name || 'Sin nombre' }}</p>
              <p v-if="sp.username" class="text-[10px] text-muted-foreground truncate">{{ sp.username.startsWith('@') ? sp.username : '@' + sp.username }}</p>
            </div>
            <span v-if="sp.amount" class="text-xs font-black text-amber-600 dark:text-amber-400 tabular-nums">${{ sp.amount }}</span>
          </div>
        </div>
      </div>

      <!-- More indicator -->
      <div v-if="entries.length > 8" class="py-3 text-center bg-muted/20">
        <p class="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider">
          +{{ entries.length - 8 }} relevos anteriores
        </p>
      </div>
    </div>
  </div>
</template>