<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import {
  Sparkles, User, Ruler, Heart, BookOpen, Flame,
  ShieldAlert, Star, MessageSquare, Tag, Crown,
  DollarSign, Instagram, Send, Share2, Check, X,
  ChevronRight, Camera
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  assignedModels: any[]
}>()

const auth = useAuthStore()
const models = ref<any[]>([])
const selectedModel = ref<any>(null)
const loading = ref(true)

// Analytics data
const contentTags = ref<any[]>([])
const spenders = ref<any[]>([])
const logbookEntries = ref<any[]>([])
const loadingAnalytics = ref(false)

const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://essenza-core-production.up.railway.app/api/v1'

async function fetchModels() {
  loading.value = true
  try {
    const res = await fetch(`${apiUrl}/admin/models/active`, {
      headers: { 'Authorization': `Bearer ${auth.user?.token}` }
    })
    if (res.ok) {
      const data = await res.json()

      // Filtrar solo las modelos que el chatter tiene asignadas según la prop
      if (props.assignedModels && props.assignedModels.length > 0) {
        const assignedIds = props.assignedModels.map(m => m.id)
        models.value = data.filter((m: any) => assignedIds.includes(m.id))
      } else {
        models.value = []
      }

      if (models.value.length > 0) {
        selectedModel.value = models.value[0]
      } else {
        selectedModel.value = null
      }
    }
  } catch (err) {
    console.error('Error fetching models:', err)
  } finally {
    loading.value = false
  }
}

async function loadModelAnalytics(modelId: number) {
  loadingAnalytics.value = true
  try {
    const headers = { 'Authorization': `Bearer ${auth.user?.token}` }
    const [tagsRes, spendersRes, logbookRes] = await Promise.all([
      fetch(`${apiUrl}/admin/models/${modelId}/content-tags`, { headers }),
      fetch(`${apiUrl}/admin/models/${modelId}/spenders`, { headers }),
      fetch(`${apiUrl}/admin/models/${modelId}/logbook/latest`, { headers })
    ])

    if (tagsRes.ok) contentTags.value = await tagsRes.json()
    if (spendersRes.ok) spenders.value = await spendersRes.json()
    if (logbookRes.ok) logbookEntries.value = await logbookRes.json()
  } catch (err) {
    console.error('Error loading analytics:', err)
  } finally {
    loadingAnalytics.value = false
  }
}

watch(selectedModel, (newVal) => {
  if (newVal?.id) loadModelAnalytics(newVal.id)
})

onMounted(fetchModels)

const avatarColors = [
  'bg-violet-500', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500',
  'bg-blue-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
]
function getAvatarColor(name: string) {
  if (!name) return 'bg-zinc-500'
  const idx = name.charCodeAt(0) % avatarColors.length
  return avatarColors[idx]
}
</script>

<template>
  <div class="flex flex-col lg:flex-row min-h-[600px] bg-background overflow-hidden">
    <!-- Sidebar: Model List -->
    <aside class="w-full lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-muted/20 flex flex-col">
      <div class="p-4 border-b border-border flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles class="w-4 h-4 text-primary" />
          </div>
          <span class="text-sm font-bold tracking-tight">Portfolio Models</span>
        </div>
        <Badge variant="outline" class="text-[10px] font-bold">{{ models.length }}</Badge>
      </div>

      <ScrollArea class="flex-1">
        <div class="p-2 space-y-1">
          <button v-for="model in models" :key="model.id" @click="selectedModel = model"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group" :class="selectedModel?.id === model.id
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'hover:bg-muted text-foreground'">

            <Avatar class="h-9 w-9 shrink-0 shadow-sm">
              <AvatarFallback :class="[
                selectedModel?.id === model.id ? 'bg-primary-foreground/20 text-primary-foreground' : getAvatarColor(model.name) + ' text-white',
                'text-sm font-bold'
              ]">
                {{ model.name.charAt(0) }}
              </AvatarFallback>
            </Avatar>

            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold truncate leading-none mb-1">{{ model.name }}</p>
              <p class="text-[10px] font-medium truncate opacity-70">
                {{ model.alias || 'Modelo Activa' }}
              </p>
            </div>
            <ChevronRight class="w-4 h-4 opacity-40" />
          </button>
        </div>
      </ScrollArea>
    </aside>

    <!-- Main Content: Model Details -->
    <main v-if="selectedModel" class="flex-1 flex flex-col overflow-hidden bg-card">
      <header class="p-6 border-b border-border bg-gradient-to-r from-muted/30 to-transparent">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div class="flex items-center gap-5">
            <Avatar class="h-20 w-20 ring-4 ring-background shadow-xl">
              <AvatarFallback :class="[getAvatarColor(selectedModel.name), 'text-white text-3xl font-bold']">
                {{ selectedModel.name.charAt(0) }}
              </AvatarFallback>
            </Avatar>
            <div class="space-y-1.5">
              <div class="flex items-center gap-2 flex-wrap">
                <h2 class="text-3xl font-black tracking-tight text-foreground">{{ selectedModel.name }}</h2>
                <Badge variant="secondary" class="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">
                  ACTIVA</Badge>
              </div>
              <div class="flex items-center gap-3 text-sm font-medium text-muted-foreground flex-wrap">
                <span v-if="selectedModel.alias" class="italic text-primary">"{{ selectedModel.alias }}"</span>
                <span v-if="selectedModel.location" class="flex items-center gap-1"><span
                    class="w-1 h-1 rounded-full bg-border" /> {{ selectedModel.location }}</span>
                <span v-if="selectedModel.age" class="flex items-center gap-1"><span
                    class="w-1 h-1 rounded-full bg-border" /> {{ selectedModel.age }} años</span>
              </div>

              <!-- Social Links -->
              <div class="flex items-center gap-2 pt-2">
                <Button v-if="selectedModel.instagram" variant="outline" size="sm"
                  class="h-8 text-[10px] font-bold uppercase tracking-wider gap-1.5 px-3 rounded-full border-pink-500/20 hover:bg-pink-500/5 text-pink-600">
                  <Instagram class="w-3.5 h-3.5" /> {{ selectedModel.instagram }}
                </Button>
                <Button v-if="selectedModel.telegram" variant="outline" size="sm"
                  class="h-8 text-[10px] font-bold uppercase tracking-wider gap-1.5 px-3 rounded-full border-sky-500/20 hover:bg-sky-500/5 text-sky-600">
                  <Send class="w-3.5 h-3.5" /> Telegram
                </Button>
              </div>
            </div>
          </div>

          <!-- Quick Stats for Chatters -->
          <div class="grid grid-cols-2 gap-3 shrink-0">
            <div
              class="p-3 bg-violet-500/5 border border-violet-500/10 rounded-xl flex flex-col items-center justify-center text-center">
              <p class="text-[9px] font-black text-violet-500 uppercase tracking-widest mb-1">Top Tag</p>
              <p class="text-xs font-bold truncate max-w-[80px]">{{ contentTags[0]?.tag || '---' }}</p>
            </div>
            <div
              class="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl flex flex-col items-center justify-center text-center">
              <p class="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">Top Spender</p>
              <p class="text-xs font-bold truncate max-w-[80px]">{{ spenders[0]?.name || '---' }}</p>
            </div>
          </div>
        </div>
      </header>

      <div class="flex-1 overflow-hidden">
        <ScrollArea class="h-full">
          <div class="p-6">
            <Tabs default-value="bio" class="space-y-6">
              <TabsList class="w-full justify-start h-12 p-1.5 bg-muted/50 rounded-xl">
                <TabsTrigger value="bio" class="px-6 rounded-lg text-xs font-bold uppercase tracking-wide">Bio &
                  Personaje</TabsTrigger>
                <TabsTrigger value="body" class="px-6 rounded-lg text-xs font-bold uppercase tracking-wide">Atributos
                </TabsTrigger>
                <TabsTrigger value="sop" class="px-6 rounded-lg text-xs font-bold uppercase tracking-wide">SOP & Ventas
                </TabsTrigger>
                <TabsTrigger value="history"
                  class="px-6 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2">
                  <MessageSquare class="w-3.5 h-3.5" /> Bitácora
                </TabsTrigger>
              </TabsList>

              <!-- BIO & PERSONALITY -->
              <TabsContent value="bio" class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card class="border-border/60 shadow-none bg-muted/10">
                    <CardHeader class="pb-3">
                      <CardTitle
                        class="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <User class="w-4 h-4" /> Datos del Personaje
                      </CardTitle>
                    </CardHeader>
                    <CardContent class="space-y-0">
                      <div v-for="(item, i) in [
                        { label: 'Ciudad natal', value: selectedModel.hometown },
                        { label: 'Pareja', value: selectedModel.hasPartner ? 'Sí' : 'No' },
                        { label: 'Hijos', value: selectedModel.hasChildren ? 'Sí' : 'No' },
                        { label: 'Mascotas', value: selectedModel.pets },
                        { label: 'Estudios', value: selectedModel.studies },
                        { label: 'Trabajo cobertura', value: selectedModel.coverJob },
                      ]" :key="i">
                        <div class="flex justify-between items-center py-2.5">
                          <span class="text-xs text-muted-foreground font-medium">{{ item.label }}</span>
                          <span class="text-xs font-bold">{{ item.value || '---' }}</span>
                        </div>
                        <Separator v-if="i < 5" class="bg-border/40" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card class="border-border/60 shadow-none col-span-1 md:col-span-2">
                    <CardHeader class="pb-3">
                      <CardTitle
                        class="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <BookOpen class="w-4 h-4" /> Historia & Personaje (Bio)
                      </CardTitle>
                    </CardHeader>
                    <CardContent class="space-y-4">
                      <p
                        class="text-sm leading-relaxed text-foreground/80 whitespace-pre-line bg-muted/20 p-4 rounded-xl italic">
                        "{{ selectedModel.bio || 'Sin historia registrada.' }}"
                      </p>
                      <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-1">
                          <p class="text-[10px] font-black text-muted-foreground uppercase">Rasgos de Personalidad</p>
                          <p class="text-xs font-bold">{{ selectedModel.personalityTraits || '---' }}</p>
                        </div>
                        <div class="space-y-1">
                          <p class="text-[10px] font-black text-muted-foreground uppercase">Hobby Favorito</p>
                          <p class="text-xs font-bold">{{ selectedModel.hobbies || '---' }}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div class="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/10 space-y-3">
                    <div class="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                      <ShieldAlert class="w-4 h-4" />
                      <p class="text-xs font-black uppercase tracking-widest">Lo que ODIAN / Red Flags</p>
                    </div>
                    <p class="text-sm font-medium text-rose-600/80 dark:text-rose-400/80 leading-relaxed">{{
                      selectedModel.hates || 'Sin datos.' }}</p>
                  </div>
                  <div class="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-3">
                    <div class="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <Star class="w-4 h-4" />
                      <p class="text-xs font-black uppercase tracking-widest">Notas Especiales / SOP Chat</p>
                    </div>
                    <p class="text-sm font-medium text-amber-600/80 dark:text-amber-400/80 leading-relaxed">{{
                      selectedModel.specialNotes || 'Sin notas.' }}</p>
                  </div>
                </div>
              </TabsContent>

              <!-- BODY & ATTRIBUTES -->
              <TabsContent value="body" class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card class="border-border/60 shadow-none">
                    <CardHeader class="pb-3">
                      <CardTitle
                        class="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <Ruler class="w-4 h-4" /> Dimensiones
                      </CardTitle>
                    </CardHeader>
                    <CardContent class="space-y-0">
                      <div v-for="(item, i) in [
                        { label: 'Altura', value: selectedModel.height },
                        { label: 'Peso', value: selectedModel.weight },
                        { label: 'Pecho', value: selectedModel.breastSize ? selectedModel.breastSize + ' (' + (selectedModel.breastType || 'Nat') + ')' : '---' },
                        { label: 'Culo', value: selectedModel.buttSize },
                        { label: 'Ojos', value: selectedModel.eyes },
                        { label: 'Pelo', value: selectedModel.hair },
                      ]" :key="i">
                        <div class="flex justify-between items-center py-3">
                          <span class="text-xs text-muted-foreground font-medium">{{ item.label }}</span>
                          <span class="text-xs font-bold">{{ item.value || '---' }}</span>
                        </div>
                        <Separator v-if="i < 5" class="bg-border/40" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card class="border-border/60 shadow-none col-span-1 md:col-span-2 flex flex-col">
                    <CardHeader class="pb-3">
                      <CardTitle
                        class="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <Camera class="w-4 h-4" /> Marcas de Identificación
                      </CardTitle>
                    </CardHeader>
                    <CardContent
                      class="flex-1 flex flex-col justify-center bg-muted/10 m-4 rounded-xl border border-dashed border-border/60">
                      <div class="p-6 text-center space-y-3">
                        <p class="text-sm font-bold text-foreground/80 leading-relaxed max-w-md mx-auto">
                          {{ selectedModel.tattoos || 'No se han registrado tatuajes o marcas específicas para esta modelo.' }}
                        </p>
                        <p class="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Crucial para
                          verificar autenticidad en chats</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <!-- SOP & SALES -->
              <TabsContent value="sop" class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card class="border-rose-500/20 bg-rose-500/5 shadow-none">
                    <CardHeader class="pb-3">
                      <CardTitle
                        class="text-xs font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 flex items-center gap-2">
                        <Flame class="w-4 h-4" /> Preferencias Sexuales
                      </CardTitle>
                    </CardHeader>
                    <CardContent class="space-y-4">
                      <div class="p-4 bg-background/60 rounded-xl border border-rose-500/10">
                        <p class="text-[9px] font-black text-rose-500 uppercase mb-1">En el sexo prefiere...</p>
                        <p class="text-xs font-bold leading-relaxed">{{ selectedModel.sexualPreferences || '---' }}</p>
                      </div>
                      <div class="p-4 bg-background/60 rounded-xl border border-rose-500/10">
                        <p class="text-[9px] font-black text-rose-500 uppercase mb-1">Juguetes & Fetiches</p>
                        <p class="text-xs font-bold leading-relaxed">{{ selectedModel.toys || '---' }}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card class="border-emerald-500/20 bg-emerald-500/5 shadow-none">
                    <CardHeader class="pb-3">
                      <CardTitle
                        class="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                        <Check class="w-4 h-4" /> Servicios Permitidos (Customs)
                      </CardTitle>
                    </CardHeader>
                    <CardContent class="space-y-4">
                      <div class="grid grid-cols-2 gap-3">
                        <div v-for="item in [
                          { label: 'Anal', key: 'allowedAnal' },
                          { label: 'Boy/Girl', key: 'allowedBoyGirl' },
                          { label: 'Girl/Girl', key: 'allowedGirlGirl' },
                          { label: 'Live Call', key: 'allowedLiveCall' },
                          { label: 'JOI', key: 'allowedJOI' },
                          { label: 'Striptease', key: 'allowedStriptease' },
                        ]" :key="item.key" class="flex items-center gap-2.5 p-2 rounded-lg border bg-background/60"
                          :class="selectedModel[item.key] ? 'border-emerald-500/30 text-emerald-700 dark:text-emerald-400' : 'border-rose-500/20 text-rose-600/50 dark:text-rose-400/50'">
                          <div class="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                            :class="selectedModel[item.key] ? 'bg-emerald-500/20' : 'bg-rose-500/10'">
                            <component :is="selectedModel[item.key] ? Check : X" class="w-3 h-3" />
                          </div>
                          <span class="text-xs font-black uppercase tracking-tight">{{ item.label }}</span>
                        </div>
                      </div>
                      <Separator class="bg-emerald-500/20" />
                      <div>
                        <p class="text-[9px] font-black text-emerald-600 uppercase mb-1">Instrucciones de Contenido
                          Personalizado</p>
                        <p class="text-xs font-bold italic">{{ selectedModel.customContentRules || 'Sin reglas específicas.' }}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card class="border-border/60 shadow-none">
                  <CardHeader class="pb-3">
                    <CardTitle
                      class="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                      <Tag class="w-4 h-4" /> Etiquetas de Contenido más vendido
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div class="flex flex-wrap gap-2">
                      <Badge v-for="tag in contentTags" :key="tag.tag" variant="secondary"
                        class="px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-full bg-muted/50 border-border/50">
                        {{ tag.tag }} <span class="ml-2 opacity-40">×{{ tag.count }}</span>
                      </Badge>
                      <p v-if="contentTags.length === 0" class="text-xs font-medium text-muted-foreground italic">No hay
                        registros de ventas recientes.</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <!-- BITACORA / HISTORY -->
              <TabsContent value="history" class="space-y-6">
                <div v-if="logbookEntries.length > 0" class="space-y-4">
                  <div v-for="entry in logbookEntries" :key="entry.id"
                    class="p-4 rounded-xl border border-border bg-muted/5 space-y-3">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <div
                          class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                          {{ entry.authorName?.charAt(0) }}
                        </div>
                        <span class="text-xs font-bold">{{ entry.authorName }}</span>
                        <span class="text-[10px] text-muted-foreground font-medium">• {{ new
                          Date(entry.timestamp).toLocaleString() }}</span>
                      </div>
                      <Badge v-if="entry.priority === 'HIGH'" variant="destructive" class="text-[9px] font-black">
                        URGENTE</Badge>
                    </div>
                    <p class="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{{ entry.message }}</p>
                  </div>
                </div>
                <div v-else
                  class="flex flex-col items-center justify-center py-20 text-center gap-4 border-2 border-dashed border-border rounded-2xl">
                  <div class="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                    <MessageSquare class="w-6 h-6 text-muted-foreground/40" />
                  </div>
                  <div class="space-y-1">
                    <p class="text-sm font-bold">Sin novedades registradas</p>
                    <p class="text-xs text-muted-foreground">Las actualizaciones de tus compañeros aparecerán aquí.</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </div>
    </main>

    <!-- Empty State -->
    <div v-else class="flex-1 flex flex-col items-center justify-center p-12 text-center bg-muted/5">
      <div
        class="w-24 h-24 rounded-[2.5rem] bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-6 shadow-inner">
        <ShieldAlert class="w-10 h-10 text-zinc-400" />
      </div>
      <div class="max-w-md space-y-3">
        <h3 class="text-2xl font-black tracking-tight text-foreground uppercase">Sin Modelos Asignadas</h3>
        <p class="text-sm text-muted-foreground leading-relaxed">
          No tienes modelos vinculadas a tu perfil en este momento.
          Por favor, contacta con tu <span class="text-primary font-bold">Manager</span> para que se te asigne el
          portfolio correspondiente.
        </p>
        <div class="pt-6">
          <Button variant="outline" class="rounded-full font-bold px-8" @click="fetchModels">
            Reintentar Sincronización
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Transiciones suaves para los tabs */
.tabs-content {
  animation: slide-up 0.3s ease-out;
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
