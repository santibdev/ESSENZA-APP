<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'vue-sonner'
import { Video, Image, Mic, Clock, User, MessageSquare, ExternalLink, Upload, Download } from 'lucide-vue-next'
import { customsApi } from '@/lib/customsApi'
import { useTimezone } from '@/composables/useTimezone'

const props = defineProps<{
  modelIds: number[]
}>()

const { formatDateTime } = useTimezone()
const customs = ref([])
const loading = ref(false)
const selectedCustom = ref(null)
const showDetail = ref(false)
const showComplete = ref(false)
const driveLink = ref('')
const comment = ref('')

const typeConfig = {
  VIDEO_CALL: { label: 'Videollamada', icon: Video, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  IMAGE: { label: 'Imágenes/Videos', icon: Image, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  AUDIO: { label: 'Audio', icon: Mic, color: 'text-amber-500', bg: 'bg-amber-500/10' }
}

const statusConfig = {
  CREATED: { label: 'Creado', color: 'bg-gray-500' },
  SENT: { label: 'Enviado', color: 'bg-blue-500' },
  READY_FOR_UPLOAD: { label: 'Listo para subir', color: 'bg-orange-500' },
  COMPLETED: { label: 'Completado', color: 'bg-green-500' }
}

const priorityConfig = {
  LOW: { label: 'Baja', color: 'text-gray-500' },
  NORMAL: { label: 'Normal', color: 'text-blue-500' },
  HIGH: { label: 'Alta', color: 'text-orange-500' },
  URGENT: { label: 'Urgente', color: 'text-red-500' }
}

const pendingCustoms = computed(() => customs.value.filter(c => c.status !== 'COMPLETED'))
const completedCustoms = computed(() => customs.value.filter(c => c.status === 'COMPLETED'))

async function load() {
  if (!props.modelIds?.length) return
  loading.value = true
  try {
    const response = await customsApi.list({ modelIds: props.modelIds })
    customs.value = response.data
  } catch {
    toast.error('Error al cargar customs')
  } finally {
    loading.value = false
  }
}

function openDetail(custom) {
  selectedCustom.value = custom
  showDetail.value = true
}

function openComplete(custom) {
  selectedCustom.value = custom
  driveLink.value = ''
  comment.value = ''
  showComplete.value = true
}

async function submitComplete() {
  if (!driveLink.value.trim()) {
    toast.error('El link de Drive es obligatorio')
    return
  }
  try {
    await customsApi.updateStatus(selectedCustom.value.id, {
      status: 'COMPLETED',
      driveLink: driveLink.value,
      comment: comment.value
    })
    toast.success('Custom completado')
    showComplete.value = false
    load()
  } catch {
    toast.error('Error al completar custom')
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <!-- Pending Customs -->
    <div>
      <div class="flex items-center gap-2 mb-4">
        <Clock class="w-4 h-4 text-orange-500" />
        <h3 class="font-semibold">Customs Pendientes</h3>
        <Badge variant="secondary">{{ pendingCustoms.length }}</Badge>
      </div>
      
      <div v-if="loading" class="text-center py-8 text-muted-foreground">
        Cargando customs...
      </div>
      
      <div v-else-if="!pendingCustoms.length" class="text-center py-8 text-muted-foreground">
        No hay customs pendientes
      </div>
      
      <div v-else class="grid gap-3">
        <Card v-for="custom in pendingCustoms" :key="custom.id" class="cursor-pointer hover:shadow-md transition-shadow" @click="openDetail(custom)">
          <CardHeader class="pb-3">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center" :class="typeConfig[custom.type].bg">
                  <component :is="typeConfig[custom.type].icon" class="w-4 h-4" :class="typeConfig[custom.type].color" />
                </div>
                <div>
                  <p class="font-medium text-sm">{{ typeConfig[custom.type].label }}</p>
                  <p class="text-xs text-muted-foreground">{{ custom.modelName }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <Badge :class="priorityConfig[custom.priority].color" variant="outline" class="text-xs">
                  {{ priorityConfig[custom.priority].label }}
                </Badge>
                <Badge :class="statusConfig[custom.status].color" class="text-white text-xs">
                  {{ statusConfig[custom.status].label }}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent class="pt-0">
            <div class="space-y-2">
              <p class="text-sm text-muted-foreground line-clamp-2">
                {{ JSON.parse(custom.templateData || '{}').description || 'Sin descripción' }}
              </p>
              <div class="flex items-center justify-between text-xs text-muted-foreground">
                <span>{{ formatDateTime(custom.createdAt) }}</span>
                <div class="flex items-center gap-1">
                  <MessageSquare class="w-3 h-3" />
                  <span>{{ custom.history?.length || 0 }}</span>
                </div>
              </div>
              
              <!-- Ready for upload action -->
              <div v-if="custom.status === 'READY_FOR_UPLOAD'" class="pt-2 border-t">
                <div class="flex items-center gap-2 text-xs text-orange-600 mb-2">
                  <Download class="w-3 h-3" />
                  <span>Descargar del Drive y subir contenido</span>
                </div>
                <div class="flex gap-2">
                  <Button size="sm" variant="outline" @click.stop="window.open(custom.driveLink, '_blank')" class="text-xs h-7">
                    <ExternalLink class="w-3 h-3 mr-1" />
                    Ver Drive
                  </Button>
                  <Button size="sm" @click.stop="openComplete(custom)" class="text-xs h-7">
                    <Upload class="w-3 h-3 mr-1" />
                    Completar
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Completed Customs -->
    <div v-if="completedCustoms.length">
      <div class="flex items-center gap-2 mb-4">
        <div class="w-4 h-4 rounded-full bg-green-500"></div>
        <h3 class="font-semibold">Completados</h3>
        <Badge variant="secondary">{{ completedCustoms.length }}</Badge>
      </div>
      
      <div class="grid gap-2">
        <Card v-for="custom in completedCustoms" :key="custom.id" class="cursor-pointer hover:shadow-sm transition-shadow opacity-75" @click="openDetail(custom)">
          <CardContent class="p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-6 h-6 rounded-lg flex items-center justify-center" :class="typeConfig[custom.type].bg">
                  <component :is="typeConfig[custom.type].icon" class="w-3 h-3" :class="typeConfig[custom.type].color" />
                </div>
                <div>
                  <p class="font-medium text-sm">{{ typeConfig[custom.type].label }}</p>
                  <p class="text-xs text-muted-foreground">{{ custom.modelName }}</p>
                </div>
              </div>
              <div class="text-xs text-muted-foreground">
                {{ formatDateTime(custom.updatedAt) }}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Detail Modal -->
    <Dialog v-model:open="showDetail">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <component :is="typeConfig[selectedCustom?.type]?.icon" class="w-5 h-5" :class="typeConfig[selectedCustom?.type]?.color" />
            {{ typeConfig[selectedCustom?.type]?.label }}
          </DialogTitle>
        </DialogHeader>
        
        <div v-if="selectedCustom" class="space-y-4">
          <!-- Info -->
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-muted-foreground">Modelo:</span>
              <span class="ml-2 font-medium">{{ selectedCustom.modelName }}</span>
            </div>
            <div>
              <span class="text-muted-foreground">Estado:</span>
              <Badge :class="statusConfig[selectedCustom.status].color" class="text-white text-xs ml-2">
                {{ statusConfig[selectedCustom.status].label }}
              </Badge>
            </div>
            <div>
              <span class="text-muted-foreground">Prioridad:</span>
              <span class="ml-2" :class="priorityConfig[selectedCustom.priority].color">
                {{ priorityConfig[selectedCustom.priority].label }}
              </span>
            </div>
            <div>
              <span class="text-muted-foreground">Creado:</span>
              <span class="ml-2">{{ formatDateTime(selectedCustom.createdAt) }}</span>
            </div>
          </div>

          <Separator />

          <!-- Template Data -->
          <div>
            <h4 class="font-medium mb-2">Detalles del Custom</h4>
            <div class="bg-muted/50 rounded-lg p-3 text-sm space-y-2">
              <div v-for="(value, key) in JSON.parse(selectedCustom.templateData || '{}')" :key="key">
                <span class="text-muted-foreground capitalize">{{ key }}:</span>
                <span class="ml-2">{{ value }}</span>
              </div>
            </div>
          </div>

          <!-- Drive Link -->
          <div v-if="selectedCustom.driveLink">
            <h4 class="font-medium mb-2">Link de Drive</h4>
            <Button variant="outline" size="sm" @click="window.open(selectedCustom.driveLink, '_blank')">
              <ExternalLink class="w-4 h-4 mr-2" />
              Abrir Drive
            </Button>
          </div>

          <!-- History -->
          <div v-if="selectedCustom.history?.length">
            <h4 class="font-medium mb-2">Historial</h4>
            <ScrollArea class="h-32">
              <div class="space-y-2">
                <div v-for="h in selectedCustom.history" :key="h.id" class="text-sm border-l-2 border-muted pl-3">
                  <div class="flex items-center justify-between">
                    <span class="font-medium">{{ h.action }}</span>
                    <span class="text-xs text-muted-foreground">{{ formatDateTime(h.createdAt) }}</span>
                  </div>
                  <p v-if="h.comment" class="text-muted-foreground mt-1">{{ h.comment }}</p>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Complete Modal -->
    <Dialog v-model:open="showComplete">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Completar Custom</DialogTitle>
        </DialogHeader>
        
        <div class="space-y-4">
          <div>
            <Label>Link de Drive *</Label>
            <Input v-model="driveLink" placeholder="https://drive.google.com/..." />
          </div>
          <div>
            <Label>Comentario</Label>
            <Textarea v-model="comment" placeholder="Comentarios adicionales..." />
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-6">
          <Button variant="outline" @click="showComplete = false">Cancelar</Button>
          <Button @click="submitComplete">Completar</Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>