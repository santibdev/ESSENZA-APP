<script setup lang="ts">
import { ref, computed } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'vue-sonner'
import { Video, Image, Mic, Upload, X, AlertTriangle } from 'lucide-vue-next'
import VideoCallTemplate from './VideoCallTemplate.vue'
import ImageTemplate from './ImageTemplate.vue'
import AudioTemplate from './AudioTemplate.vue'
import { customsApi } from '@/lib/customsApi'

const props = defineProps<{
  open: boolean
  models: { id: number; name: string }[]
}>()
const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'created'): void
}>()

const type = ref<'VIDEO_CALL' | 'IMAGE' | 'AUDIO' | null>(null)
const selectedModelId = ref<number | null>(null)
const priority = ref('NORMAL')
const templateData = ref<Record<string, string>>({})
const attachments = ref<{ url: string; description: string }[]>([])
const uploading = ref(false)
const saving = ref(false)

const typeOptions = [
  { id: 'VIDEO_CALL', label: 'Videollamada', icon: Video, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'IMAGE', label: 'Imágenes/Videos', icon: Image, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { id: 'AUDIO', label: 'Audio', icon: Mic, color: 'text-amber-500', bg: 'bg-amber-500/10' },
]

const priorityOptions = [
  { id: 'LOW', label: 'Baja' },
  { id: 'NORMAL', label: 'Normal' },
  { id: 'HIGH', label: 'Alta' },
  { id: 'URGENT', label: 'Urgente' },
]

const canSubmit = computed(() => type.value && selectedModelId.value && Object.keys(templateData.value).length > 0)

async function handleFileUpload(event: Event) {
  const files = (event.target as HTMLInputElement).files
  if (!files?.length) return
  uploading.value = true
  try {
    for (const file of Array.from(files)) {
      const result = await customsApi.uploadAttachment(0, file)
      attachments.value.push({ url: result.url, description: '' })
    }
  } catch {
    toast.error('Error al subir imagen')
  } finally {
    uploading.value = false
  }
}

async function submit() {
  if (!canSubmit.value) return
  saving.value = true
  try {
    await customsApi.create({
      type: type.value,
      modelId: selectedModelId.value,
      priority: priority.value,
      templateData: JSON.stringify(templateData.value),
      attachments: attachments.value.length ? JSON.stringify(attachments.value) : null
    })
    toast.success('Custom creado correctamente')
    emit('created')
    emit('update:open', false)
    reset()
  } catch {
    toast.error('Error al crear el custom')
  } finally {
    saving.value = false
  }
}

function reset() {
  type.value = null
  selectedModelId.value = null
  priority.value = 'NORMAL'
  templateData.value = {}
  attachments.value = []
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
      <DialogHeader class="shrink-0">
        <DialogTitle class="text-base font-black tracking-tight">Nuevo Custom</DialogTitle>
      </DialogHeader>

      <div class="flex-1 overflow-y-auto py-2">
        <!-- Type selector -->
        <div class="mb-5">
          <p class="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Tipo de Custom</p>
          <div class="grid grid-cols-3 gap-2">
            <button v-for="t in typeOptions" :key="t.id" @click="type = t.id as any; templateData = {}"
              class="flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all"
              :class="type === t.id ? 'border-primary bg-primary/5' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'">
              <span class="w-9 h-9 rounded-lg flex items-center justify-center" :class="t.bg">
                <component :is="t.icon" class="w-4 h-4" :class="t.color" />
              </span>
              <span class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{{ t.label }}</span>
            </button>
          </div>
        </div>

        <!-- 2-column layout: left = config, right = template -->
        <div class="grid grid-cols-2 gap-5">
          <!-- Left column: model, priority, attachments -->
          <div class="space-y-4">
            <div>
              <label class="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Modelo</label>
              <select v-model="selectedModelId"
                class="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option :value="null" disabled>Seleccionar modelo</option>
                <option v-for="m in models" :key="m.id" :value="m.id">{{ m.name }}</option>
              </select>
            </div>

            <div>
              <label class="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Prioridad</label>
              <select v-model="priority"
                class="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option v-for="p in priorityOptions" :key="p.id" :value="p.id">{{ p.label }}</option>
              </select>
            </div>

            <!-- Attachments -->
            <div v-if="type">
              <p class="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Imágenes de referencia</p>
              <div class="flex flex-wrap gap-2 mb-2">
                <div v-for="(att, i) in attachments" :key="i"
                  class="relative w-20 h-20 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 group">
                  <img :src="att.url" class="w-full h-full object-cover" />
                  <button @click="attachments.splice(i, 1)"
                    class="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X class="w-3 h-3 text-white" />
                  </button>
                </div>
                <label class="w-20 h-20 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                  <Upload class="w-4 h-4 text-zinc-400" />
                  <span class="text-[10px] text-zinc-400 mt-1">{{ uploading ? '...' : 'Subir' }}</span>
                  <input type="file" class="hidden" accept="image/*" multiple @change="handleFileUpload" :disabled="uploading" />
                </label>
              </div>
              <div v-for="(att, i) in attachments" :key="`desc-${i}`" class="mb-2">
                <input v-model="att.description" :placeholder="`Descripción imagen ${i + 1}`"
                  class="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>

            <div v-if="!type" class="flex items-center gap-2 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-zinc-400 text-sm">
              <AlertTriangle class="w-4 h-4 shrink-0" />
              Seleccioná el tipo de custom para continuar
            </div>
          </div>

          <!-- Right column: template form -->
          <div v-if="type">
            <p class="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Datos del Custom</p>
            <VideoCallTemplate v-if="type === 'VIDEO_CALL'" v-model="templateData" />
            <ImageTemplate v-else-if="type === 'IMAGE'" v-model="templateData" />
            <AudioTemplate v-else-if="type === 'AUDIO'" v-model="templateData" />
          </div>
          <div v-else class="flex items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400 text-sm">
            El formulario aparecerá aquí
          </div>
        </div>
      </div>

      <DialogFooter class="shrink-0 pt-2 border-t border-zinc-100 dark:border-zinc-800">
        <Button variant="outline" @click="emit('update:open', false)">Cancelar</Button>
        <Button @click="submit" :disabled="!canSubmit || saving">
          {{ saving ? 'Creando...' : 'Crear Custom' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
