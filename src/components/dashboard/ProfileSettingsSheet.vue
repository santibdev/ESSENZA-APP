<script setup lang="ts">
/**
 * ProfileSettingsSheet.vue
 * Slide-in panel for user profile settings — timezone, name display, etc.
 * Opened from DashboardSidebar or Topbar.
 */
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'vue-sonner'
import api from '@/api'
import { Globe, User, Clock, CheckCircle2, ChevronDown, Search } from 'lucide-vue-next'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { TIMEZONE_OPTIONS } from '@/lib/useTimezone'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const auth = useAuthStore()

// ── Timezone selection ─────────────────────────────────────────────────────

const selectedTz = ref(auth.user?.timezone || 'America/Argentina/Buenos_Aires')
const tzSearch = ref('')
const saving = ref(false)

// Keep in sync if user object changes (e.g. after login)
watch(() => auth.user?.timezone, (tz) => { if (tz) selectedTz.value = tz })

const filteredTimezones = computed(() => {
  const q = tzSearch.value.trim().toLowerCase()
  if (!q) return TIMEZONE_OPTIONS
  return TIMEZONE_OPTIONS.filter(t =>
    t.label.toLowerCase().includes(q) || t.value.toLowerCase().includes(q)
  )
})

const currentLocalTime = computed(() => {
  if (!selectedTz.value) return ''
  try {
    return new Intl.DateTimeFormat('es-AR', {
      timeZone: selectedTz.value,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'long',
    }).format(new Date())
  } catch { return '' }
})

async function saveTimezone() {
  if (selectedTz.value === auth.user?.timezone) {
    toast.info('Ya estás usando ese horario')
    return
  }
  saving.value = true
  try {
    await api.put('/admin/users/me/timezone', { timezone: selectedTz.value })
    auth.updateTimezone(selectedTz.value)
    toast.success('Zona horaria actualizada', {
      description: `Ahora usás ${selectedTz.value}`
    })
  } catch {
    toast.error('Error al guardar la zona horaria')
  } finally {
    saving.value = false
  }
}

const tzOpen = ref(false)
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent class="w-[360px] sm:w-[420px] flex flex-col gap-0 p-0 overflow-hidden">

      <!-- Header -->
      <SheetHeader class="px-6 pt-6 pb-4 border-b border-border">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <User class="w-5 h-5 text-primary" />
          </div>
          <div>
            <SheetTitle class="text-base leading-none">{{ auth.user?.name }}</SheetTitle>
            <SheetDescription class="text-xs mt-0.5">@{{ auth.user?.username }}</SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <!-- Scrollable body -->
      <div class="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        <!-- ── Zona Horaria ─────────────────────────────────────────────── -->
        <section class="space-y-3">
          <div class="flex items-center gap-2">
            <Globe class="w-4 h-4 text-primary" />
            <h3 class="text-sm font-semibold text-foreground">Zona Horaria</h3>
          </div>
          <p class="text-xs text-muted-foreground leading-relaxed">
            Los turnos del admin se convierten automáticamente a tu horario local.
            Elegí el país/ciudad donde trabajás.
          </p>

          <!-- Live clock preview -->
          <div class="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/20">
            <Clock class="w-3.5 h-3.5 text-primary shrink-0" />
            <div class="flex-1 min-w-0">
              <p class="text-[10px] text-muted-foreground uppercase tracking-wide">Tu hora actual</p>
              <p class="text-sm font-bold text-foreground capitalize">{{ currentLocalTime }}</p>
            </div>
          </div>

          <!-- Timezone search + list -->
          <div class="space-y-2">
            <div class="relative">
              <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                v-model="tzSearch"
                placeholder="Buscar país o ciudad..."
                class="w-full h-9 pl-8 pr-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div class="rounded-lg border border-border overflow-hidden max-h-56 overflow-y-auto">
              <button
                v-for="tz in filteredTimezones"
                :key="tz.value"
                class="w-full flex items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                :class="selectedTz === tz.value ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'"
                @click="selectedTz = tz.value"
              >
                <span class="truncate">{{ tz.label }}</span>
                <CheckCircle2 v-if="selectedTz === tz.value" class="w-3.5 h-3.5 shrink-0 ml-2 text-primary" />
              </button>
              <div v-if="!filteredTimezones.length" class="px-3 py-4 text-xs text-center text-muted-foreground">
                Sin resultados para "{{ tzSearch }}"
              </div>
            </div>
          </div>

          <!-- Current saved vs selected -->
          <div v-if="auth.user?.timezone !== selectedTz" class="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Cambio pendiente de guardar
          </div>

          <Button
            class="w-full gap-2"
            :disabled="saving || selectedTz === auth.user?.timezone"
            @click="saveTimezone"
          >
            <Globe class="w-3.5 h-3.5" />
            {{ saving ? 'Guardando...' : 'Guardar zona horaria' }}
          </Button>
        </section>

        <Separator />

        <!-- ── Placeholder para futuras configuraciones ─────────────────── -->
        <section class="space-y-3">
          <h3 class="text-sm font-semibold text-foreground text-muted-foreground/50">Próximamente</h3>
          <div class="space-y-2 opacity-40 pointer-events-none select-none">
            <div class="h-8 rounded-md bg-muted/50 border border-border" />
            <div class="h-8 rounded-md bg-muted/50 border border-border w-3/4" />
          </div>
          <p class="text-[10px] text-muted-foreground/50">Notificaciones, idioma, apariencia...</p>
        </section>

      </div>

    </SheetContent>
  </Sheet>
</template>
