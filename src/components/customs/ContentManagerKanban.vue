<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { toast } from 'vue-sonner'
import { Video, Image, Mic, RefreshCw, Clock, Send, Upload, CheckCircle2, Link, ZoomIn, X, Copy } from 'lucide-vue-next'
import { customsApi } from '@/lib/customsApi'

const customs = ref<any[]>([])
const loading = ref(false)

// Drag & drop
const draggingId = ref<number | null>(null)
const dragOverColumn = ref<string | null>(null)

// Move dialog
const moveDialogOpen = ref(false)
const pendingMove = ref<{ customId: number; newStatus: string } | null>(null)
const moveComment = ref('')
const moveDriveLink = ref('')
const moveSaving = ref(false)

// Detail dialog
const detailOpen = ref(false)
const selectedCustom = ref<any>(null)

const columns = [
  { id: 'CREATED', label: 'Creados', color: 'text-zinc-600 dark:text-zinc-400', bg: 'bg-zinc-100 dark:bg-zinc-800' },
  { id: 'SENT', label: 'Enviados', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/20' },
  { id: 'READY_FOR_UPLOAD', label: 'Listos para subir', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-500/20' },
  { id: 'COMPLETED', label: 'Completados', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/20' },
]

const statusLabel: Record<string, string> = {
  CREATED: 'Creados', SENT: 'Enviados', READY_FOR_UPLOAD: 'Listos para subir', COMPLETED: 'Completados'
}

const typeConfig: Record<string, { icon: any; color: string; label: string }> = {
  VIDEO_CALL: { icon: Video, color: 'text-blue-500', label: 'Videollamada' },
  IMAGE: { icon: Image, color: 'text-purple-500', label: 'Imágenes/Videos' },
  AUDIO: { icon: Mic, color: 'text-amber-500', label: 'Audio' },
}

const priorityDot: Record<string, string> = {
  LOW: 'bg-zinc-400', NORMAL: 'bg-blue-500', HIGH: 'bg-orange-500', URGENT: 'bg-red-500'
}

const isReadyForUpload = computed(() => pendingMove.value?.newStatus === 'READY_FOR_UPLOAD')
const canConfirm = computed(() => moveComment.value.trim() && (!isReadyForUpload.value || moveDriveLink.value.trim()))

const templateParsed = computed(() => {
  if (!selectedCustom.value?.templateData) return {}
  try { return JSON.parse(selectedCustom.value.templateData) } catch { return {} }
})

const attachmentsParsed = computed(() => {
  if (!selectedCustom.value?.attachments) return []
  try { return JSON.parse(selectedCustom.value.attachments) } catch { return [] }
})

function byStatus(status: string) {
  return customs.value.filter(c => c.status === status)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

async function load() {
  loading.value = true
  try { customs.value = await customsApi.list() }
  catch { } finally { loading.value = false }
}

// Drag handlers
function onDragStart(id: number) { draggingId.value = id }
function onDragOver(e: DragEvent, col: string) { e.preventDefault(); dragOverColumn.value = col }
function onDragLeave() { dragOverColumn.value = null }
function onDrop(e: DragEvent, targetStatus: string) {
  e.preventDefault()
  dragOverColumn.value = null
  if (!draggingId.value) return
  const custom = customs.value.find(c => c.id === draggingId.value)
  draggingId.value = null
  if (!custom || custom.status === targetStatus) return
  pendingMove.value = { customId: custom.id, newStatus: targetStatus }
  moveComment.value = ''
  moveDriveLink.value = ''
  moveDialogOpen.value = true
}

async function confirmMove() {
  if (!pendingMove.value || !canConfirm.value) return
  moveSaving.value = true
  try {
    await customsApi.updateStatus(pendingMove.value.customId, {
      status: pendingMove.value.newStatus,
      comment: moveComment.value,
      ...(isReadyForUpload.value ? { driveLink: moveDriveLink.value } : {})
    })
    toast.success('Estado actualizado')
    moveDialogOpen.value = false
    await load()
  } catch {
    toast.error('Error al actualizar')
  } finally {
    moveSaving.value = false
  }
}

function openDetail(custom: any) {
  selectedCustom.value = custom
  detailOpen.value = true
}

async function copyWhatsApp() {
  const result = await customsApi.exportAllWhatsApp()
  await navigator.clipboard.writeText(result.message)
  toast.success('Resumen copiado')
}

onMounted(load)
</script>

<template>
  <div class="h-full flex flex-col gap-4 p-4 lg:p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Gestión de Customs</h1>
        <p class="text-xs text-zinc-400 mt-0.5">{{ customs.length }} customs en total · Arrastrá para cambiar estado</p>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" @click="copyWhatsApp" class="gap-1.5 text-xs">
          <Copy class="w-3.5 h-3.5" /> WhatsApp
        </Button>
        <button @click="load" class="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
          <RefreshCw class="w-4 h-4 text-zinc-400" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </div>

    <!-- Kanban -->
    <div class="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3 min-h-0">
      <div v-for="col in columns" :key="col.id" class="flex flex-col min-h-0"
        @dragover="onDragOver($event, col.id)"
        @dragleave="onDragLeave"
        @drop="onDrop($event, col.id)">

        <div class="flex items-center gap-2 mb-2 shrink-0">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-black" :class="[col.bg, col.color]">
            {{ col.label }}
          </span>
          <span class="text-xs text-zinc-400">{{ byStatus(col.id).length }}</span>
        </div>

        <ScrollArea class="flex-1">
          <div class="space-y-2 pr-1 min-h-[60px] rounded-xl transition-all"
            :class="dragOverColumn === col.id ? 'bg-primary/5 ring-2 ring-primary/20 rounded-xl' : ''">
            <div v-if="!byStatus(col.id).length && dragOverColumn !== col.id"
              class="p-3 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400">
              Sin customs
            </div>
            <div v-for="custom in byStatus(col.id)" :key="custom.id"
              draggable="true"
              @dragstart="onDragStart(custom.id)"
              class="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-sm transition-all group"
              :class="draggingId === custom.id ? 'opacity-40' : ''"
              @click="openDetail(custom)">

              <div class="flex items-start justify-between gap-2 mb-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                    :class="typeConfig[custom.type]?.color.replace('text-', 'bg-').replace('500', '500/10')">
                    <component :is="typeConfig[custom.type]?.icon" class="w-3 h-3" :class="typeConfig[custom.type]?.color" />
                  </span>
                  <p class="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{{ custom.model?.name }}</p>
                </div>
                <span class="w-2 h-2 rounded-full shrink-0 mt-1" :class="priorityDot[custom.priority]" />
              </div>

              <p class="text-[10px] text-zinc-400 truncate">{{ typeConfig[custom.type]?.label }}</p>
              <p class="text-[10px] text-zinc-400 mt-1">{{ formatDate(custom.createdAt) }} · {{ custom.createdByUser?.name }}</p>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>

    <!-- Move dialog -->
    <Dialog v-model:open="moveDialogOpen">
      <DialogContent class="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader class="px-5 pt-5 pb-4 border-b border-border">
          <DialogTitle class="text-base font-black tracking-tight">
            Mover a "{{ pendingMove ? statusLabel[pendingMove.newStatus] : '' }}"
          </DialogTitle>
        </DialogHeader>
        <div class="p-5 space-y-4">
          <div v-if="isReadyForUpload" class="space-y-2">
            <Label>Link de Drive <span class="text-red-500">*</span></Label>
            <Input v-model="moveDriveLink" placeholder="https://drive.google.com/..." />
          </div>
          <div class="space-y-2">
            <Label>Comentario <span class="text-red-500">*</span></Label>
            <Textarea v-model="moveComment"
              :placeholder="isReadyForUpload ? 'Ej: Contenido subido al Drive, listo para enviar...' : 'Ej: Se envió el chat a la modelo...'"
              :rows="3" />
          </div>
          <p v-if="!canConfirm" class="text-xs text-amber-600 dark:text-amber-400">
            {{ isReadyForUpload && !moveDriveLink.trim() ? 'El link de Drive es obligatorio.' : 'El comentario es obligatorio.' }}
          </p>
        </div>
        <div class="px-5 pb-5 flex gap-2 justify-end">
          <Button variant="outline" @click="moveDialogOpen = false">Cancelar</Button>
          <Button @click="confirmMove" :disabled="!canConfirm || moveSaving">
            {{ moveSaving ? 'Guardando...' : 'Confirmar' }}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Detail dialog (read-only for CM) -->
    <Dialog v-model:open="detailOpen">
      <DialogContent class="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader class="px-5 pt-5 pb-4 border-b border-border">
          <div class="flex items-center gap-3">
            <span v-if="selectedCustom" class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              :class="typeConfig[selectedCustom.type]?.color.replace('text-', 'bg-').replace('500', '500/10')">
              <component :is="typeConfig[selectedCustom.type]?.icon" class="w-4 h-4" :class="typeConfig[selectedCustom.type]?.color" />
            </span>
            <div>
              <DialogTitle class="text-sm font-black tracking-tight">
                {{ selectedCustom?.model?.name }} — {{ typeConfig[selectedCustom?.type]?.label }}
              </DialogTitle>
              <p class="text-xs text-zinc-400 mt-0.5">Creado por {{ selectedCustom?.createdByUser?.name }} · {{ selectedCustom?.createdAt ? formatDate(selectedCustom.createdAt) : '' }}</p>
            </div>
          </div>
        </DialogHeader>
        <ScrollArea class="max-h-[60vh]">
          <div class="p-5 space-y-4">
            <div v-for="(value, key) in templateParsed" :key="key" v-show="value"
              class="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900">
              <p class="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">{{ key }}</p>
              <p class="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">{{ value }}</p>
            </div>
            <div v-if="attachmentsParsed.length">
              <p class="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Imágenes de referencia</p>
              <div class="flex flex-wrap gap-2">
                <img v-for="(att, i) in attachmentsParsed" :key="i"
                  :src="att.url" class="w-24 h-24 rounded-lg object-cover border border-border cursor-pointer"
                  @click="window.open(att.url, '_blank')" />
              </div>
            </div>
            <div v-if="selectedCustom?.driveLink" class="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
              <p class="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide mb-1">Link de Drive</p>
              <a :href="selectedCustom.driveLink" target="_blank" class="text-sm text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 break-all">
                <Link class="w-3.5 h-3.5 shrink-0" /> {{ selectedCustom.driveLink }}
              </a>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  </div>
</template>
