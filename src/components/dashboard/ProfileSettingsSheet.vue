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
import { Globe, User, Clock, CheckCircle2, ChevronsUpDown, Search } from 'lucide-vue-next'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList
} from '@/components/ui/command'
import { TIMEZONE_OPTIONS } from '@/lib/useTimezone'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const auth = useAuthStore()

// ── Timezone selection ─────────────────────────────────────────────────────
const selectedTz = ref(auth.user?.timezone || 'America/Argentina/Buenos_Aires')
const saving = ref(false)
const comboboxOpen = ref(false)

// Keep in sync if user object changes (e.g. after login)
watch(() => auth.user?.timezone, (tz) => { if (tz) selectedTz.value = tz })

const selectedLabel = computed(() => {
  const found = TIMEZONE_OPTIONS.find(t => t.value === selectedTz.value)
  return found?.label || selectedTz.value
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

function selectTimezone(tz: string) {
  selectedTz.value = tz
  comboboxOpen.value = false
}

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
      description: `Ahora usás ${selectedLabel.value}`
    })
  } catch {
    toast.error('Error al guardar la zona horaria')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent class="w-[360px] sm:w-[420px] flex flex-col gap-0 p-0 overflow-hidden">

      <!-- Header -->
      <SheetHeader class="px-6 pt-6 pb-4 border-b border-border">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full overflow-hidden border border-border shrink-0">
            <img v-if="auth.user?.profilePictureUrl || auth.user?.profilePictureBase64" 
              :src="auth.user?.profilePictureUrl || auth.user?.profilePictureBase64"
              class="w-full h-full object-cover" />
            <div v-else class="w-full h-full bg-primary/10 flex items-center justify-center">
              <User class="w-5 h-5 text-primary" />
            </div>
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

          <!-- Timezone Combobox -->
          <Popover v-model:open="comboboxOpen">
            <PopoverTrigger as-child>
              <Button
                variant="outline"
                role="combobox"
                :aria-expanded="comboboxOpen"
                class="w-full justify-between h-10 font-medium text-sm"
              >
                <span class="truncate">{{ selectedLabel }}</span>
                <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent class="w-[var(--reka-popper-anchor-width)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar país o ciudad..." />
                <CommandEmpty>Sin resultados.</CommandEmpty>
                <CommandList>
                  <CommandGroup>
                    <CommandItem
                      v-for="tz in TIMEZONE_OPTIONS"
                      :key="tz.value"
                      :value="tz.label"
                      @select="selectTimezone(tz.value)"
                    >
                      <CheckCircle2
                        class="mr-2 h-4 w-4 shrink-0"
                        :class="selectedTz === tz.value ? 'opacity-100 text-primary' : 'opacity-0'"
                      />
                      <span class="truncate">{{ tz.label }}</span>
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

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

