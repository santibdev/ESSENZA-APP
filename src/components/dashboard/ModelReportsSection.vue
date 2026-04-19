<script setup lang="ts">
import { ref, watch } from 'vue'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Clock,
  User,
  MessageSquare,
  Tag,
  DollarSign,
  Plus,
  X,
  ChevronDown,
  Star,
  Dot,
} from 'lucide-vue-next'
import api from '@/api'

interface Model {
  id: number
  name: string
  alias?: string
}

interface Spender {
  name: string
  username: string
  amount: string
}

interface ModelReport {
  handoffNotes: string
  contentItems: string[]
  spenders: Spender[]
}

interface LastReport {
  message: string
  soldContent: string[]
  spenders: Spender[]
  createdAt: string
  fromUser: string
}

const props = defineProps<{
  assignedModels: Model[]
  isWorking: boolean
}>()

const modelReports = defineModel<Record<number, ModelReport>>('modelReports', { default: {} })
const historyOpen = ref<Record<number, boolean>>({})
const lastReports = ref<Record<number, LastReport>>({})
const contentInputs = ref<Record<number, string>>({})

function getReport(modelId: number): ModelReport {
  if (!modelReports.value[modelId]) {
    modelReports.value[modelId] = { handoffNotes: '', contentItems: [], spenders: [] }
  }
  return modelReports.value[modelId]
}

function addContentItem(modelId: number) {
  const val = (contentInputs.value[modelId] ?? '').trim().toLowerCase()
  if (!val) return
  const report = getReport(modelId)
  if (!report.contentItems.includes(val)) {
    report.contentItems.push(val)
  }
  contentInputs.value[modelId] = ''
}

function removeContentItem(modelId: number, item: string) {
  const report = getReport(modelId)
  report.contentItems = report.contentItems.filter(i => i !== item)
}

function addSpender(modelId: number) {
  getReport(modelId).spenders.push({ name: '', username: '', amount: '' })
}

function removeSpender(modelId: number, idx: number) {
  getReport(modelId).spenders.splice(idx, 1)
}

function formatRelativeTime(dateStr: string): string {
  const diffMins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (diffMins < 60) return `Hace ${diffMins}m`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `Hace ${diffHours}h`
  return `Hace ${Math.floor(diffHours / 24)}d`
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

watch(
  () => props.assignedModels,
  async (models) => {
    models.forEach(m => {
      if (!(m.id in modelReports.value)) {
        modelReports.value[m.id] = {
          handoffNotes: '',
          contentItems: [],
          spenders: [{ name: '', username: '', amount: '' }],
        }
      }
      if (!(m.id in historyOpen.value)) historyOpen.value[m.id] = false
      if (!(m.id in contentInputs.value)) contentInputs.value[m.id] = ''
    })

    if (!models.length) return

    try {
      const ids = models.map(m => m.id).join(',')
      const res = await api.get(`/admin/models/handoff?modelIds=${ids}`)
      if (res.data) {
        Object.entries(res.data).forEach(([modelId, entries]: [string, any[]]) => {
          if (entries?.length) {
            const latest = entries[0]
            lastReports.value[Number(modelId)] = {
              message: latest.message || '',
              soldContent: latest.soldContentJson ? JSON.parse(latest.soldContentJson) : [],
              spenders: latest.spendersJson ? JSON.parse(latest.spendersJson) : [],
              createdAt: latest.timestamp,
              fromUser: latest.authorName || latest.fromUser || '',
            }
          }
        })
      }
    } catch (err) {
      console.error('Error loading handoff data:', err)
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="grid grid-cols-2 gap-4">

    <!-- ───────────────────────────── LEFT: Historial ───────────────────────────── -->
    <Card>
      <CardHeader class="pb-3">
        <CardTitle class="text-sm font-medium">Historial de relevo</CardTitle>
        <CardDescription>Turno anterior</CardDescription>
      </CardHeader>

      <CardContent class="space-y-2 p-4 pt-0">
        <div v-for="model in assignedModels" :key="`history-${model.id}`">
          <Collapsible v-model:open="historyOpen[model.id]">

            <CollapsibleTrigger as-child>
              <button
                class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 transition-colors text-left">
                <div class="flex items-center gap-2.5">
                  <ChevronDown class="size-3.5 text-muted-foreground shrink-0 transition-transform duration-200"
                    :class="{ 'rotate-180': historyOpen[model.id] }" />
                  <div>
                    <p class="text-sm font-medium leading-none">{{ model.name }}</p>
                    <p v-if="model.alias" class="text-xs text-muted-foreground mt-0.5">@{{ model.alias }}</p>
                  </div>
                </div>

                <Badge v-if="lastReports[model.id]" variant="secondary" class="text-[10px] gap-1 font-medium">
                  <Clock class="size-2.5" />
                  {{ formatRelativeTime(lastReports[model.id].createdAt) }}
                </Badge>
                <Badge v-else variant="outline" class="text-[10px] text-muted-foreground">
                  Sin actividad
                </Badge>
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div v-if="lastReports[model.id]"
                class="ml-6 mt-2 rounded-lg border border-border bg-muted/20 p-3 space-y-3">
                <!-- Meta -->
                <div class="flex items-center gap-4 text-xs text-muted-foreground">
                  <span v-if="lastReports[model.id].fromUser" class="flex items-center gap-1">
                    <User class="size-3" />
                    <span class="font-medium text-foreground">{{ lastReports[model.id].fromUser }}</span>
                  </span>
                  <span class="flex items-center gap-1">
                    <Clock class="size-3" />
                    {{ formatDateTime(lastReports[model.id].createdAt) }}
                  </span>
                </div>

                <Separator />

                <!-- Observaciones -->
                <div v-if="lastReports[model.id].message">
                  <p
                    class="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                    <MessageSquare class="size-3" /> Observaciones
                  </p>
                  <p class="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                    {{ lastReports[model.id].message }}
                  </p>
                </div>

                <!-- Contenido vendido -->
                <div v-if="lastReports[model.id].soldContent?.length">
                  <p
                    class="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                    <Tag class="size-3" /> Contenido vendido
                  </p>
                  <div class="flex flex-wrap gap-1">
                    <Badge v-for="(item, i) in lastReports[model.id].soldContent" :key="i" variant="secondary"
                      class="text-xs">
                      {{ item }}
                    </Badge>
                  </div>
                </div>

                <!-- Spenders -->
                <div v-if="lastReports[model.id].spenders?.length">
                  <p
                    class="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                    <DollarSign class="size-3" /> Spenders principales
                  </p>
                  <div class="flex flex-wrap gap-1.5">
                    <div v-for="(sp, i) in lastReports[model.id].spenders" :key="i"
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-background text-xs">
                      <span class="font-medium">{{ sp.name || sp.username }}</span>
                      <span v-if="sp.name && sp.username" class="text-muted-foreground">@{{ sp.username }}</span>
                      <span v-if="sp.amount" class="font-semibold text-emerald-600 dark:text-emerald-400">
                        ${{ sp.amount }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleContent>

          </Collapsible>
        </div>
      </CardContent>
    </Card>

    <!-- ───────────────────────────── RIGHT: Asignación ───────────────────────────── -->
    <Card>
      <CardHeader class="pb-3">
        <div class="flex items-start justify-between">
          <div>
            <CardTitle class="text-sm font-medium flex items-center gap-1.5">
              <Dot class="size-4 text-emerald-500 fill-emerald-500 -ml-1" />
              Asignación actual
            </CardTitle>
            <CardDescription>Observaciones en tiempo real</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent class="p-4 pt-0">
        <Tabs :default-value="String(assignedModels[0]?.id)" class="w-full">

          <!-- Tabs list -->
          <TabsList class="mb-4 h-8">
            <TabsTrigger v-for="model in assignedModels" :key="model.id" :value="String(model.id)"
              class="text-xs px-3 h-7">
              {{ model.name }}
            </TabsTrigger>
          </TabsList>

          <!-- Tab content per model -->
          <TabsContent v-for="model in assignedModels" :key="model.id" :value="String(model.id)" class="space-y-4 mt-0">
            <!-- Observaciones -->
            <div class="space-y-1.5">
              <label class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Observaciones
              </label>
              <Textarea v-model="getReport(model.id).handoffNotes" placeholder="Anotá detalles del turno…"
                :disabled="!isWorking" class="min-h-[72px] text-xs resize-none" />
            </div>

            <!-- Contenido más vendido -->
            <div class="space-y-1.5">
              <label
                class="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <Tag class="size-3" /> Contenido más vendido
              </label>

              <div v-if="getReport(model.id).contentItems.length" class="flex flex-wrap gap-1.5 mb-2">
                <Badge v-for="tag in getReport(model.id).contentItems" :key="tag" variant="secondary"
                  class="text-xs gap-1 pl-2.5 pr-1.5 py-0.5">
                  {{ tag }}
                  <button class="rounded-full hover:bg-destructive/20 hover:text-destructive transition-colors p-0.5"
                    @click="removeContentItem(model.id, tag)">
                    <X class="size-2.5" />
                  </button>
                </Badge>
              </div>

              <div class="flex gap-2">
                <Input v-model="contentInputs[model.id]" placeholder="Ej: mixto, foto x4, video…" :disabled="!isWorking"
                  class="h-8 text-xs" @keydown.enter.prevent="addContentItem(model.id)"
                  @keydown.exact.prevent.comma="addContentItem(model.id)" />
                <Button variant="outline" size="sm" class="h-8 px-3 shrink-0" :disabled="!isWorking"
                  @click="addContentItem(model.id)">
                  <Plus class="size-3.5" />
                </Button>
              </div>
            </div>

            <!-- Spenders -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label
                  class="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  <Star class="size-3 fill-amber-400 text-amber-400" /> Spenders principales
                </label>
                <Button variant="ghost" size="sm"
                  class="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1" :disabled="!isWorking"
                  @click="addSpender(model.id)">
                  <Plus class="size-3" /> Añadir
                </Button>
              </div>

              <ScrollArea class="max-h-40">
                <div class="space-y-2 pr-2">
                  <div v-for="(sp, sIdx) in getReport(model.id).spenders" :key="sIdx" class="grid gap-2"
                    :style="{ gridTemplateColumns: getReport(model.id).spenders.length > 1 ? '1fr 1fr 5rem 2rem' : '1fr 1fr 5rem' }">
                    <Input v-model="sp.name" placeholder="Nombre" class="h-8 text-xs" :disabled="!isWorking" />
                    <Input v-model="sp.username" placeholder="@usuario" class="h-8 text-xs" :disabled="!isWorking" />
                    <Input v-model="sp.amount" placeholder="$" class="h-8 text-xs" :disabled="!isWorking" />
                    <Button v-if="getReport(model.id).spenders.length > 1" variant="ghost" size="icon"
                      class="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      :disabled="!isWorking" @click="removeSpender(model.id, sIdx)">
                      <X class="size-3.5" />
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

        </Tabs>
      </CardContent>
    </Card>

  </div>
</template>