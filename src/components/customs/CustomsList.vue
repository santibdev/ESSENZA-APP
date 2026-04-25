<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'vue-sonner'
import { Video, Image, Mic, Clock, RefreshCw, CheckCircle, ExternalLink, Eye, Send } from 'lucide-vue-next'
import { customsApi } from '@/lib/customsApi'

const props = defineProps<{
  modelIds: number[]
}>()

function formatDateTime(dateString) {
  if (!dateString) return 'Fecha no disponible'
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Fecha inválida'
    
    return date.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    return 'Fecha inválida'
  }
}

function translateField(field) {
  const translations = {
    'ofUser': 'Usuario OF',
    'nick': 'Nick',
    'price': 'Precio',
    'time': 'Tiempo',
    'language': 'Idioma',
    'quantity': 'Cantidad',
    'notes': 'Notas',
    'description': 'Descripción',
    'fanName': 'Nombre del Fan',
    'duration': 'Duración'
  }
  return translations[field] || field
}

function translatePriority(priority) {
  const translations = {
    'LOW': 'Baja',
    'NORMAL': 'Normal', 
    'HIGH': 'Alta',
    'URGENT': 'Urgente'
  }
  return translations[priority] || priority
}

function getPriorityColor(priority) {
  const colors = {
    'LOW': 'text-gray-600',
    'NORMAL': 'text-blue-600',
    'HIGH': 'text-orange-600', 
    'URGENT': 'text-red-600'
  }
  return colors[priority] || 'text-gray-600'
}

function getTimelineColor(action) {
  const colors = {
    'CREATED': 'bg-blue-500',
    'STATUS_CHANGED': 'bg-orange-500',
    'COMMENT_ADDED': 'bg-green-500',
    'COMPLETED': 'bg-emerald-500'
  }
  return colors[action] || 'bg-gray-500'
}

function translateAction(action) {
  const translations = {
    'CREATED': 'Creado',
    'STATUS_CHANGED': 'Estado cambiado',
    'COMMENT_ADDED': 'Comentario agregado',
    'COMPLETED': 'Completado',
    'SENT': 'Enviado',
    'READY_FOR_UPLOAD': 'Listo para subir'
  }
  return translations[action] || action
}

function getUserInitial(historyItem) {
  const username = historyItem.createdByUser?.username || 
                   historyItem.username || 
                   historyItem.user?.username || 
                   'Sistema'
  return username.charAt(0).toUpperCase()
}

const customs = ref([])
const loading = ref(false)
const selectedCustom = ref(null)
const showDetail = ref(false)
const showComplete = ref(false)
const comment = ref('')
const newComment = ref('')
const addingComment = ref(false)

const typeConfig = {
  VIDEO_CALL: { label: 'Videollamada', icon: Video, color: 'bg-blue-500' },
  IMAGE: { label: 'Imágenes/Videos', icon: Image, color: 'bg-purple-500' },
  AUDIO: { label: 'Audio', icon: Mic, color: 'bg-amber-500' }
}

const statusConfig = {
  CREATED: { label: 'Creado', color: 'bg-slate-500' },
  SENT: { label: 'Enviado', color: 'bg-blue-500' },
  READY_FOR_UPLOAD: { label: 'Listo', color: 'bg-orange-500' },
  COMPLETED: { label: 'Enviado', color: 'bg-green-500' }
}

const activeCustoms = computed(() => customs.value.filter(c => c.status !== 'COMPLETED'))
const completedCustoms = computed(() => customs.value.filter(c => c.status === 'COMPLETED'))

async function load() {
  if (!props.modelIds?.length) return
  loading.value = true
  try {
    const response = await customsApi.list({ modelIds: props.modelIds })
    customs.value = response || []
  } catch (error) {
    toast.error('Error al cargar customs')
  } finally {
    loading.value = false
  }
}

function openDetail(custom) {
  selectedCustom.value = custom
  console.log('Selected custom:', custom)
  console.log('History:', custom.history)
  showDetail.value = true
}

function openComplete(custom) {
  selectedCustom.value = custom
  comment.value = 'Contenido enviado al fan'
  showComplete.value = true
}

async function submitComplete() {
  try {
    await customsApi.updateStatus(selectedCustom.value.id, {
      status: 'COMPLETED',
      comment: comment.value
    })
    toast.success('Custom completado')
    showComplete.value = false
    load()
  } catch {
    toast.error('Error al completar custom')
  }
}

async function addComment() {
  if (!newComment.value.trim()) return
  addingComment.value = true
  try {
    await customsApi.addComment(selectedCustom.value.id, newComment.value)
    newComment.value = ''
    toast.success('Comentario agregado')
    
    // Reload the specific custom to get updated history
    const updatedCustom = await customsApi.get(selectedCustom.value.id)
    selectedCustom.value = updatedCustom
    
    // Also update in the main list
    const customIndex = customs.value.findIndex(c => c.id === selectedCustom.value.id)
    if (customIndex !== -1) {
      customs.value[customIndex] = updatedCustom
    }
  } catch (error) {
    console.error('Error adding comment:', error)
    toast.error('Error al agregar comentario')
  } finally {
    addingComment.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">Mis Customs</h3>
      <Button @click="load" variant="outline" size="sm" :disabled="loading">
        <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
      </Button>
    </div>

    <!-- Active Customs -->
    <div v-if="activeCustoms.length" class="space-y-3">
      <div v-for="custom in activeCustoms" :key="custom.id">
        <Card class="overflow-hidden">
          <CardContent class="p-0">
            <!-- Header -->
            <div class="flex items-center justify-between p-4 pb-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full flex items-center justify-center text-white" 
                     :class="typeConfig[custom.type].color">
                  <component :is="typeConfig[custom.type].icon" class="w-5 h-5" />
                </div>
                <div>
                  <h4 class="font-medium">{{ typeConfig[custom.type].label }}</h4>
                  <p class="text-sm text-muted-foreground">{{ custom.model?.name }}</p>
                </div>
              </div>
              <Badge class="text-white" :class="statusConfig[custom.status].color">
                {{ statusConfig[custom.status].label }}
              </Badge>
            </div>

            <!-- Content -->
            <div class="px-4 pb-3">
              <p class="text-sm text-muted-foreground mb-3">
                {{ JSON.parse(custom.templateData || '{}').description || 'Sin descripción' }}
              </p>
              <div class="text-xs text-muted-foreground">
                {{ formatDateTime(custom.createdAt) }}
              </div>
            </div>

            <!-- Actions -->
            <div class="border-t bg-muted/30 p-3 flex gap-2">
              <Button variant="outline" size="sm" @click="openDetail(custom)" class="flex-1">
                <Eye class="w-4 h-4 mr-1" />
                Ver detalles
              </Button>
              
              <Button v-if="custom.status === 'READY_FOR_UPLOAD'" 
                      variant="outline" size="sm" 
                      @click="window.open(custom.driveLink, '_blank')">
                <ExternalLink class="w-4 h-4 mr-1" />
                Drive
              </Button>
              
              <Button v-if="custom.status === 'READY_FOR_UPLOAD'" 
                      size="sm" @click="openComplete(custom)" 
                      class="bg-green-600 hover:bg-green-700 text-white">
                <Send class="w-4 h-4 mr-1" />
                Enviado
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!loading" class="text-center py-12">
      <CheckCircle class="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
      <h4 class="font-medium mb-2">No hay customs pendientes</h4>
      <p class="text-sm text-muted-foreground">Todos los customs están completados</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <RefreshCw class="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
      <p class="text-muted-foreground">Cargando customs...</p>
    </div>

    <!-- Completed (collapsed) -->
    <div v-if="completedCustoms.length" class="pt-4 border-t">
      <details class="group">
        <summary class="flex items-center justify-between cursor-pointer p-2 rounded hover:bg-muted/50">
          <span class="text-sm font-medium text-muted-foreground">
            Completados ({{ completedCustoms.length }})
          </span>
          <CheckCircle class="w-4 h-4 text-green-500" />
        </summary>
        <div class="mt-2 space-y-2">
          <div v-for="custom in completedCustoms.slice(0, 5)" :key="custom.id" 
               class="flex items-center justify-between p-3 rounded border bg-muted/20 cursor-pointer hover:bg-muted/40"
               @click="openDetail(custom)">
            <div class="flex items-center gap-3">
              <div class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs" 
                   :class="typeConfig[custom.type].color">
                <component :is="typeConfig[custom.type].icon" class="w-3 h-3" />
              </div>
              <div>
                <p class="text-sm font-medium">{{ typeConfig[custom.type].label }}</p>
                <p class="text-xs text-muted-foreground">{{ custom.model?.name }}</p>
              </div>
            </div>
            <div class="text-xs text-muted-foreground">
              {{ formatDateTime(custom.updatedAt || custom.createdAt) }}
            </div>
          </div>
        </div>
      </details>
    </div>

    <!-- Detail Modal -->
    <Dialog v-model:open="showDetail">
      <DialogContent class="max-w-2xl max-h-[85vh]">
        <DialogHeader class="pb-6">
          <DialogTitle class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg" 
                 :class="typeConfig[selectedCustom?.type]?.color">
              <component :is="typeConfig[selectedCustom?.type]?.icon" class="w-6 h-6" />
            </div>
            <div>
              <h3 class="text-xl font-bold">{{ typeConfig[selectedCustom?.type]?.label }}</h3>
              <p class="text-sm text-muted-foreground mt-1">{{ selectedCustom?.model?.name }}</p>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs default-value="info" class="w-full" v-if="selectedCustom">
          <TabsList class="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="info" class="text-sm">Información</TabsTrigger>
            <TabsTrigger value="history" class="text-sm">Historial</TabsTrigger>
            <TabsTrigger value="actions" class="text-sm">Acciones</TabsTrigger>
          </TabsList>
          
          <TabsContent value="info" class="space-y-6">
            <!-- Status Card -->
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-xl p-6 border">
              <div class="grid grid-cols-2 gap-6">
                <div class="flex items-center gap-3">
                  <div class="w-3 h-3 rounded-full" :class="statusConfig[selectedCustom.status]?.color || 'bg-gray-500'"></div>
                  <div>
                    <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Estado</p>
                    <p class="font-semibold">{{ statusConfig[selectedCustom.status]?.label || selectedCustom.status }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <Clock class="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Creado</p>
                    <p class="font-semibold">{{ formatDateTime(selectedCustom.createdAt) }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Details Grid -->
            <div class="space-y-4">
              <h4 class="text-lg font-semibold">Detalles del Custom</h4>
              <div class="grid gap-4">
                <div v-for="(value, key) in JSON.parse(selectedCustom.templateData || '{}')" :key="key" 
                     class="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <span class="font-medium text-muted-foreground">{{ translateField(key) }}</span>
                  <span class="font-semibold text-right">{{ value }}</span>
                </div>
              </div>
            </div>

            <!-- Priority & Model -->
            <div class="grid grid-cols-2 gap-4">
              <div class="p-4 rounded-lg border bg-card">
                <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Prioridad</p>
                <p class="font-bold text-lg" :class="getPriorityColor(selectedCustom.priority)">
                  {{ translatePriority(selectedCustom.priority) }}
                </p>
              </div>
              <div class="p-4 rounded-lg border bg-card">
                <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Modelo</p>
                <p class="font-bold text-lg">{{ selectedCustom.model?.name || 'N/A' }}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" class="space-y-6">
            <div class="flex items-center justify-between">
              <h4 class="text-lg font-semibold">Timeline de Cambios</h4>
              <Badge variant="secondary" class="text-xs">
                {{ selectedCustom.history?.length || 0 }} eventos
              </Badge>
            </div>
            
            <ScrollArea class="h-[400px] pr-4">
              <div v-if="selectedCustom.history?.length" class="space-y-6">
                <div class="relative">
                  <!-- Timeline line -->
                  <div class="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 to-muted"></div>
                  
                  <div v-for="(h, index) in selectedCustom.history" :key="h.id" class="relative flex gap-6 pb-6">
                    <!-- Timeline dot with arrow -->
                    <div class="relative z-10 flex flex-col items-center">
                      <div class="w-16 h-16 rounded-full border-4 border-background shadow-lg flex items-center justify-center"
                           :class="getTimelineColor(h.action)">
                        <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                          <span class="text-sm font-bold text-white">
                            {{ getUserInitial(h) }}
                          </span>
                        </div>
                      </div>
                      <!-- Arrow pointing to content -->
                      <div v-if="index < selectedCustom.history.length - 1" 
                           class="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-primary/30 mt-2"></div>
                    </div>
                    
                    <!-- Timeline content -->
                    <div class="flex-1 min-w-0 pt-2">
                      <div class="bg-card border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div class="flex items-start justify-between mb-4">
                          <div>
                            <h5 class="font-bold text-base">{{ translateAction(h.action) }}</h5>
                            <p class="text-sm text-muted-foreground mt-1">
                              por {{ h.createdByUser?.username || h.username || 'Sistema' }}
                            </p>
                          </div>
                          <span class="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                            {{ h.createdAt || h.timestamp ? formatDateTime(h.createdAt || h.timestamp) : formatDateTime(new Date()) }}
                          </span>
                        </div>
                        <p v-if="h.comment" class="text-sm bg-muted/50 p-4 rounded-lg border-l-4 border-primary/30">
                          "{{ h.comment }}"
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div v-else class="text-center py-12">
                <Clock class="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <p class="text-muted-foreground">No hay historial disponible</p>
              </div>
            </ScrollArea>

            <!-- Add Comment Section -->
            <div class="border-t pt-6 space-y-4">
              <h5 class="font-semibold">Agregar Comentario</h5>
              <div class="flex gap-3">
                <Textarea 
                  v-model="newComment" 
                  placeholder="Escribe un comentario..."
                  class="flex-1"
                  rows="2"
                />
                <Button 
                  @click="addComment" 
                  :disabled="!newComment.trim() || addingComment"
                  class="shrink-0"
                >
                  <MessageSquare class="w-4 h-4 mr-2" />
                  {{ addingComment ? 'Enviando...' : 'Enviar' }}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="actions" class="space-y-6">
            <h4 class="text-lg font-semibold">Acciones Disponibles</h4>
            
            <div class="space-y-4">
              <div v-if="selectedCustom.driveLink">
                <Button 
                  variant="outline" 
                  @click="window.open(selectedCustom.driveLink, '_blank')" 
                  class="w-full justify-start h-16 text-left"
                >
                  <ExternalLink class="w-6 h-6 mr-4 text-blue-500" />
                  <div>
                    <div class="font-semibold">Abrir Drive</div>
                    <div class="text-sm text-muted-foreground">Descargar contenido para enviar al fan</div>
                  </div>
                </Button>
              </div>
              
              <div v-if="selectedCustom.status === 'READY_FOR_UPLOAD'">
                <Button 
                  @click="openComplete(selectedCustom); showDetail = false" 
                  class="w-full justify-start h-16 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Send class="w-6 h-6 mr-4" />
                  <div class="text-left">
                    <div class="font-semibold">Marcar como Enviado</div>
                    <div class="text-sm opacity-90">Confirmar que se envió el contenido al fan</div>
                  </div>
                </Button>
              </div>
              
              <div v-if="!selectedCustom.driveLink && selectedCustom.status !== 'READY_FOR_UPLOAD' && selectedCustom.status !== 'COMPLETED'" 
                   class="p-6 rounded-xl bg-muted/50 text-center border-2 border-dashed border-muted-foreground/20">
                <Clock class="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p class="font-medium text-muted-foreground">Esperando que el contenido esté listo</p>
                <p class="text-sm text-muted-foreground mt-2">El Content Manager subirá el contenido pronto</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>

    <!-- Complete Modal -->
    <Dialog v-model:open="showComplete">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar Envío</DialogTitle>
        </DialogHeader>
        
        <div class="space-y-4">
          <div class="bg-green-50 dark:bg-green-950 p-3 rounded">
            <p class="text-sm text-green-700 dark:text-green-300">
              ¿Confirmás que enviaste el contenido al fan?
            </p>
          </div>
          
          <div>
            <Label>Comentario</Label>
            <Textarea v-model="comment" rows="2" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showComplete = false">Cancelar</Button>
          <Button @click="submitComplete" class="bg-green-600 hover:bg-green-700">
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>