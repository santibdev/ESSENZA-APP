<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

// UI Primitives
import { ScrollArea } from '@/components/ui/scroll-area'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { AlertTriangle, CheckCircle2, Plus, X, Play, Zap } from 'lucide-vue-next'

// Modular Components
import DashboardSidebar from '@/components/dashboard/DashboardSidebar.vue'
import Topbar from '@/components/dashboard/Topbar.vue'
import TrackerCard from '@/components/dashboard/TrackerCard.vue'
import StatsCards from '@/components/dashboard/StatsCards.vue'
import NotesCard from '@/components/dashboard/NotesCard.vue'
import AnnouncementsBanner from '@/components/dashboard/AnnouncementsBanner.vue'
import ModelHandoffCard from '@/components/dashboard/ModelHandoffCard.vue'
import MarketingPanel from '@/components/dashboard/MarketingPanel.vue'
import CreativityWall from '@/components/dashboard/CreativityWall.vue'
import LeadsKanban from '@/components/dashboard/LeadsKanban.vue'
import UserShiftHistory from '@/components/dashboard/UserShiftHistory.vue'

// Types
interface AssignedModel { id: number; name: string; alias?: string }
interface HistoryEntry {
  id: number; createdAt: string; type: string
  observations: string; earnings: number; growthPercentage: number
}
interface ModelExitReport {
  modelId: number; modelName: string; handoffNotes: string
  spenders: { name: string; username: string; amount: string }[]
}

const auth = useAuthStore()
const router = useRouter()
const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://essenza-core-production.up.railway.app/api/v1'

// --- State ---
const isWorking = ref(false)
const isPaused = ref(false)
const isAfk = ref(false)
const workTime = ref(0)
const breakTime = ref(0)
const idleTime = ref(0)
const currentShiftId = ref<number | null>(null)
const isExtraHours = ref(false)
const isExtraHoursSelection = ref(false)

const showStartModal = ref(false)
const showReportModal = ref(false)

const userSchedule = ref<any>(null)
const userOffDays = ref('')
const shiftTarget = ref<number>(0)
const assignedModels = ref<AssignedModel[]>([])
const modelsHistory = ref<Record<number, HistoryEntry[]>>({})
const activeTab = ref<'tracker' | 'history' | 'crm' | 'creative' | 'context'>('tracker')
const sidebarOpen = ref(false)

const startEarnings = ref(0)
const startEarningsMessages = ref(0)
const startEarningsTips = ref(0)
const startEarningsPosts = ref(0)
const startGrowthPercentage = ref(0)
const observations = ref('')
const isForceExit = ref(false)
const emergencyReason = ref('')

const perModelReports = ref<ModelExitReport[]>([])
const selectedModelReportIdx = ref(0)
const shiftTemplates = ref<any[]>([])

// --- Computed ---
const isMarketing = computed(() => auth.user?.role === 'ROLE_MARKETING')
const SHIFT_TARGET = computed(() => shiftTarget.value || auth.user?.shiftTargetSeconds || 28800)
const effectiveWorkSeconds = computed(() => Math.max(0, workTime.value - idleTime.value))
const shiftCompliancePercent = computed(() =>
  Math.min(100, Math.round((effectiveWorkSeconds.value / SHIFT_TARGET.value) * 100))
)
const missingShiftSeconds = computed(() => {
  if (isExtraHours.value) return 0
  return Math.max(0, SHIFT_TARGET.value - effectiveWorkSeconds.value)
})
const statusLabel = computed(() => {
  if (!isWorking.value) return 'Offline'
  if (isPaused.value) return 'En Break'
  if (isAfk.value) return 'AFK'
  return 'Activo'
})
const statusColor = computed(() => {
  if (!isWorking.value) return 'bg-zinc-500'
  if (isPaused.value) return 'bg-amber-500'
  if (isAfk.value) return 'bg-orange-500'
  return 'bg-emerald-500'
})
const statusDot = computed(() => statusColor.value)

// --- Fetch Templates ---
async function fetchTemplates() {
  try {
    const res = await api.get('/shifts/templates/batch')
    shiftTemplates.value = res.data || []
  } catch (e) {
    console.error('Error fetching templates:', e)
  }
}
let timerInterval: any = null
let breakInterval: any = null
let pollingInterval: any = null
let syncInterval: any = null
let autoScreenshotInterval: any = null
let isSyncing = false
let isPolling = false
let isCapturing = false
let hasNotifiedTargetReached = false

const authHeaders = () => ({
  'Authorization': `Bearer ${auth.user?.token}`,
  'Content-Type': 'application/json'
})

function startWorkTimer() {
  let lastTick = Date.now()
  timerInterval = setInterval(() => {
    if (!isWorking.value || isPaused.value) { if (timerInterval) clearInterval(timerInterval); return }
    const now = Date.now()
    const delta = Math.floor((now - lastTick) / 1000)
    if (delta >= 1) {
      workTime.value += delta
      if (isAfk.value) idleTime.value += delta
      lastTick = now - ((now - lastTick) % 1000)
      window.electronAPI?.shift?.syncTime(workTime.value)
      if (!hasNotifiedTargetReached && !isExtraHours.value && workTime.value >= SHIFT_TARGET.value) {
        hasNotifiedTargetReached = true
        isPaused.value = true
        if (timerInterval) clearInterval(timerInterval)
        toast.success('¡Meta Diaria Alcanzada! 🎉', { duration: 10000, description: 'Completá el reporte para continuar o finalizar.' })
        initModelReports()
        showReportModal.value = true
        window.electronAPI.sendNotification?.({ title: '¡Meta Alcanzada!', body: 'La sesión se pausó. Completá el reporte obligatorio.' })
      }
    }
  }, 1000)
}

// --- Shift Actions ---
async function startShift(isExtra = false) {
  try {
    const endpoint = isExtra ? `${apiUrl}/shifts/start-extra` : `${apiUrl}/shifts/start`
    const body = {
      initialEarnings: startEarnings.value, initialEarningsMessages: startEarningsMessages.value,
      initialEarningsTips: startEarningsTips.value, initialEarningsPosts: startEarningsPosts.value,
      initialGrowthPercentage: startGrowthPercentage.value
    }
    const res = await fetch(endpoint, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) })
    const data = await res.json()
    currentShiftId.value = data.id
    workTime.value = 0; idleTime.value = 0
    isWorking.value = true; isPaused.value = false; isExtraHours.value = isExtra
    hasNotifiedTargetReached = false
    startWorkTimer(); startPolling(); startSync(); startAutoScreenshot()
    window.electronAPI?.shift?.started({ apiUrl, token: auth.user?.token, shiftId: data.id })
    toast.success(isExtra ? 'Horas extras iniciadas' : 'Turno iniciado correctamente')
    showStartModal.value = false
  } catch (e) { console.error(e); toast.error('Error al iniciar el turno.') }
}

let clickCount = 0
let clickTimeout: any = null
async function endShiftPrompt() {
  if (isExtraHours.value || missingShiftSeconds.value <= 0) {
    isForceExit.value = false; initModelReports(); showReportModal.value = true; return
  }
  clickCount++
  if (clickCount >= 2) {
    isForceExit.value = true; initModelReports(); showReportModal.value = true
    clickCount = 0; if (clickTimeout) clearTimeout(clickTimeout); return
  }
  toast.warning('Jornada incompleta', { duration: 5000, description: `Faltan ${formatTime(missingShiftSeconds.value)}. Hacé clic otra vez para forzar el cierre.` })
  if (clickTimeout) clearTimeout(clickTimeout)
  clickTimeout = setTimeout(() => { clickCount = 0 }, 5000)
}

function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

async function submitEndShift(startExtras: boolean) {
  try {
    let payload: any = {}
    const finalObs = isForceExit.value
      ? `[CIERRE FORZADO] Razón: ${emergencyReason.value}. ${observations.value ? '\nNotas: ' + observations.value : ''}`
      : observations.value

    payload = {
      earnings: startEarnings.value, earningsMessages: startEarningsMessages.value,
      earningsTips: startEarningsTips.value, earningsPosts: startEarningsPosts.value,
      growthPercentage: startGrowthPercentage.value, observations: finalObs, force: isForceExit.value,
      modelReports: perModelReports.value
        .filter(r => r.handoffNotes || r.spenders.some(s => s.name || s.username || s.amount))
        .map(r => ({
          modelName: r.modelName,
          soldContentJson: JSON.stringify(r.handoffNotes ? r.handoffNotes.split('\n').filter(Boolean) : []),
          spendersJson: JSON.stringify(r.spenders.filter(s => s.name || s.username || s.amount))
        }))
    }

    const res = await fetch(`${apiUrl}/shifts/${currentShiftId.value}/end`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) })
    if (res.status === 412) { const e = await res.json(); toast.error(e.message || 'El turno está incompleto.'); showReportModal.value = false; return }
    if (!res.ok) throw new Error('Server error')

    resetState()
    window.electronAPI?.shift?.stopped()
    showReportModal.value = false

    if (startExtras) { toast.info('Turno cerrado. Iniciando extras...'); setTimeout(() => startShift(true), 1200) }
    else { toast.success('Turno finalizado correctamente.'); currentShiftId.value = null }
  } catch (e) { console.error(e); toast.error('Error al enviar el reporte.') }
}

async function toggleBreak() {
  if (!isWorking.value) return
  isPaused.value = !isPaused.value
  if (isPaused.value) {
    await fetch(`${apiUrl}/shifts/${currentShiftId.value}/pause`, { method: 'POST', headers: authHeaders() })
    if (timerInterval) clearInterval(timerInterval)
    breakInterval = setInterval(() => breakTime.value++, 1000)
    window.electronAPI?.shift?.paused(); toast.info('Break iniciado')
  } else {
    await fetch(`${apiUrl}/shifts/${currentShiftId.value}/resume`, { method: 'POST', headers: authHeaders() })
    if (breakInterval) clearInterval(breakInterval)
    startWorkTimer(); window.electronAPI?.shift?.resumed(); toast.success('Break finalizado — ¡A trabajar!')
  }
}

// --- Services ---
function startSync() {
  if (syncInterval) clearTimeout(syncInterval)
  const runner = async () => {
    if (!isWorking.value || isSyncing) return
    isSyncing = true
    try {
      if (window.electronAPI?.screen) {
        const afkSecs = await window.electronAPI.screen.getIdleTime()
        if (afkSecs > 60 && !isAfk.value) isAfk.value = true
        else if (afkSecs < 10 && isAfk.value) isAfk.value = false
        const activeApp = await window.electronAPI.screen.getActiveWindowName()
        await fetch(`${apiUrl}/shifts/${currentShiftId.value}/sync-app`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ activeApp, idleTimeSeconds: idleTime.value, activeTimeSeconds: workTime.value, breakTimeSeconds: breakTime.value, isAfk: isAfk.value }) })
      }
    } catch (err) { }
    finally { isSyncing = false; if (isWorking.value) syncInterval = setTimeout(runner, 5000) }
  }
  runner()
}

function startAutoScreenshot() {
  if (autoScreenshotInterval) clearTimeout(autoScreenshotInterval)
  const runner = async () => {
    if (!isWorking.value || isPaused.value || !currentShiftId.value || isCapturing) return
    isCapturing = true
    try {
      if (window.electronAPI?.screen) {
        const screensRaw = await window.electronAPI.screen.takeScreenshot()
        if (screensRaw?.length > 0) {
          await fetch(`${apiUrl}/shifts/${currentShiftId.value}/upload-screenshot`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ image: JSON.stringify(screensRaw.map((s: any) => s.image)) }) })
        }
      }
    } catch (err) { }
    finally { isCapturing = false; if (isWorking.value && !isPaused.value) autoScreenshotInterval = setTimeout(runner, 6 * 60 * 1000) }
  }
  setTimeout(runner, 1000)
}

function startPolling() {
  if (pollingInterval) clearTimeout(pollingInterval)
  const runner = async () => {
    if (!isWorking.value || isPolling) return
    isPolling = true
    try {
      const res = await fetch(`${apiUrl}/shifts/current`, { headers: authHeaders() })
      const data = await res.json()
      if (data?.pendingMessage) {
        toast.info('Mensaje de Administración', { description: data.pendingMessage, duration: 10000 })
        window.electronAPI?.sendNotification?.({ title: 'Notificación', body: data.pendingMessage })
        fetch(`${apiUrl}/shifts/${currentShiftId.value}/clear-message`, { method: 'POST', headers: authHeaders() }).catch(console.error)
      }
    } catch (err) { }
    finally { isPolling = false; if (isWorking.value) pollingInterval = setTimeout(runner, 10000) }
  }
  runner()
}

// --- Handlers ---
function initModelReports() {
  selectedModelReportIdx.value = 0
  perModelReports.value = assignedModels.value.map(m => ({
    modelId: m.id, modelName: m.name, handoffNotes: '',
    spenders: [{ name: '', username: '', amount: '' }]
  }))
}
function addSpender(mIdx: number) {
  perModelReports.value[mIdx].spenders.push({ name: '', username: '', amount: '' })
}
function removeSpender(mIdx: number, sIdx: number) {
  perModelReports.value[mIdx].spenders.splice(sIdx, 1)
}

function resetState() {
  showReportModal.value = false; currentShiftId.value = null
  isWorking.value = false; isPaused.value = false
  workTime.value = 0; breakTime.value = 0; idleTime.value = 0; observations.value = ''
  clearAllTimers()
}

function clearAllTimers() {
  if (timerInterval) clearInterval(timerInterval)
  if (breakInterval) clearInterval(breakInterval)
  if (pollingInterval) clearTimeout(pollingInterval)
  if (syncInterval) clearTimeout(syncInterval)
  if (autoScreenshotInterval) clearTimeout(autoScreenshotInterval)
}

const handoffData = ref<Record<number, any[]>>({})
async function loadHandoff() {
  if (!assignedModels.value.length) return
  try {
    const ids = assignedModels.value.map(m => m.id).join(',')
    const res = await fetch(`${apiUrl}/admin/models/handoff?modelIds=${ids}`, { headers: authHeaders() })
    if (res.ok) handoffData.value = await res.json()
  } catch { }
}

onMounted(async () => {
  fetchTemplates()
  // Initial data load
  try {
    const res = await fetch(`${apiUrl}/shifts/current`, { headers: authHeaders() })
    if (res.status === 200) {
      const data = await res.json()
      if (data && data.status !== 'COMPLETED') {
        currentShiftId.value = data.id; workTime.value = data.activeTimeSeconds || 0
        if (data.targetSeconds) shiftTarget.value = data.targetSeconds
        isWorking.value = true; isPaused.value = data.status === 'PAUSED'
        if (!isPaused.value) startWorkTimer()
        startPolling(); startSync(); startAutoScreenshot()
      }
    }
  } catch { }

  try {
    const sRes = await fetch(`${apiUrl}/admin/users/schedule/current`, { headers: authHeaders() })
    if (sRes.ok) {
      userSchedule.value = await sRes.json()
      assignedModels.value = userSchedule.value.assignedModels || []
      await loadHandoff()
    }
  } catch { }
})

onUnmounted(() => {
  clearAllTimers()
})
</script>

<template>
  <TooltipProvider :delay-duration="300">
    <div class="h-full flex bg-zinc-50 dark:bg-black text-foreground overflow-hidden font-sans select-none">

      <!-- Modular Sidebar -->
      <DashboardSidebar v-model:activeTab="activeTab" v-model:open="sidebarOpen" :is-marketing="isMarketing"
        @logout="auth.logout(); router.push({ name: 'login' })" />

      <main class="flex-1 flex flex-col min-w-0 relative overflow-hidden transition-colors duration-300 ">

        <!-- Modular Topbar -->
        <Topbar :active-tab="activeTab" :is-working="isWorking" :is-paused="isPaused" :status-label="statusLabel"
          :status-color="statusColor" :shift-target="missingShiftSeconds" @toggle-sidebar="sidebarOpen = !sidebarOpen"
          @start-shift="isExtraHoursSelection = $event; showStartModal = true" @toggle-break="toggleBreak"
          @end-shift="endShiftPrompt" />

        <ScrollArea class="flex-1 bg-zinc-100 dark:bg-zinc-800">
          <div class="max-w-[1400px] mx-auto p-4 lg:p-8 space-y-8 relative z-10 transition-all">

            <AnnouncementsBanner />

            <!-- Case: TRACKER -->
            <template v-if="activeTab === 'tracker'">
              <!-- Modular Stats Overview -->
              <StatsCards :shift-compliance-percent="shiftCompliancePercent" :work-time="workTime" :idle-time="idleTime"
                :break-time="breakTime" />

              <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Modular Tracker/Timer Card -->
                <TrackerCard :effective-work-seconds="effectiveWorkSeconds" :is-working="isWorking"
                  :is-paused="isPaused" :status-label="statusLabel" :status-dot="statusDot" @toggle-break="toggleBreak"
                  @start-shift="isExtraHoursSelection = $event; showStartModal = true" @end-shift="endShiftPrompt" />

                <!-- Modular Notes/Observations Card -->
                <NotesCard v-model="observations" />
              </div>

              <!-- Info Cards section - Moved Below -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-6">
                  <p class="text-[10px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-widest mb-4">
                    Meta Asignada</p>
                  <div class="flex items-center justify-between">
                    <p class="text-2xl font-black text-zinc-900 dark:text-white tabular-nums">{{
                      formatTime(SHIFT_TARGET) }}</p>
                    <div class="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle2 class="w-5 h-5 text-emerald-500" />
                    </div>
                  </div>
                </div>

                <div class="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-6">
                  <p class="text-[10px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-widest mb-4">
                    Modelos de Hoy</p>
                  <div class="flex flex-wrap gap-2">
                    <div v-for="m in assignedModels" :key="m.id"
                      class="px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700">
                      <span class="text-xs font-bold text-zinc-700 dark:text-zinc-300">{{ m.name }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <MarketingPanel v-if="isMarketing" ref="marketingPanelRef" />
            </template>

            <!-- Case: CONTEXT / BITACORA -->
            <template v-else-if="activeTab === 'context'">
              <div v-if="assignedModels.length > 0" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ModelHandoffCard v-for="m in assignedModels" :key="m.id" :model="{ name: m.name }"
                  :entries="handoffData[m.id] || []" />
              </div>
            </template>

            <!-- Case: CRM / MARKETING -->
            <template v-else-if="activeTab === 'crm'">
              <LeadsKanban />
            </template>

            <!-- Case: CREATIVIDAD -->
            <template v-else-if="activeTab === 'creative'">
              <CreativityWall />
            </template>

            <!-- Case: HISTORY -->
            <template v-else-if="activeTab === 'history'">
              <UserShiftHistory />
            </template>

          </div>
        </ScrollArea>
      </main>

      <!-- ── Modals ── -->
      <!-- Start Shift -->
      <Dialog v-model:open="showStartModal">
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle class="text-lg font-black uppercase tracking-tight">Preparar Turno</DialogTitle>
            <DialogDescription class="text-xs text-muted-foreground uppercase tracking-widest leading-none mt-1">
              {{ isExtraHoursSelection ? 'Iniciando Horas Extras' : 'Iniciando Jornada Regular' }}
            </DialogDescription>
          </DialogHeader>
          <div class="py-6 space-y-6">
            <div class="space-y-4">
              <div>
                <label class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 block">Facturación
                  Inicial ($)</label>
                <Input type="number" v-model="startEarnings" placeholder="0.00" class="h-12 text-lg font-bold" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <Button @click="startShift(isExtraHoursSelection)"
                class="h-12 rounded-xl font-bold uppercase tracking-wider text-xs">Confirmar</Button>
              <Button @click="showStartModal = false" variant="outline"
                class="h-12 rounded-xl font-bold uppercase tracking-wider text-xs">Cerrar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <!-- End Shift / Report -->
      <Dialog v-model:open="showReportModal">
        <DialogContent
          class="sm:max-w-2xl h-[90vh] p-0 overflow-hidden flex flex-col">
          <div :class="['h-1.5 w-full', isForceExit ? 'bg-red-500' : 'bg-emerald-500']" />

          <ScrollArea class="flex-1 px-8 py-8">
            <DialogHeader class="mb-8">
              <DialogTitle class="text-2xl font-black uppercase tracking-tight">Reporte de Turno</DialogTitle>
              <DialogDescription class="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">Completa los
                datos para finalizar</DialogDescription>
            </DialogHeader>

            <div class="space-y-8">
              <div v-if="isForceExit" class="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                <p class="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <AlertTriangle class="w-3 h-3" /> Cierre Anticipado
                </p>
                <Textarea v-model="emergencyReason" placeholder="Razón del cierre anticipado..."
                  class="border-red-500/30" />
              </div>

              <div class="space-y-4">
                <label
                  class="text-[10px] font-black text-muted-foreground uppercase tracking-widest block text-center">Facturación
                  Neta Alcanzada ($)</label>
                <Input type="number" v-model="startEarnings"
                  class="h-16 text-4xl font-black text-center text-emerald-500" />
              </div>

              <Separator />

              <div v-if="perModelReports.length > 0" class="space-y-4">
                <p class="text-xs font-black uppercase tracking-widest text-muted-foreground">Informe por Modelo</p>
                <div class="flex flex-wrap gap-2">
                  <button v-for="(mr, idx) in perModelReports" :key="mr.modelId" @click="selectedModelReportIdx = idx"
                    :class="['px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border',
                      selectedModelReportIdx === idx ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-muted-foreground border-border hover:border-primary/50']">
                    {{ mr.modelName }}
                  </button>
                </div>

                <div class="p-6 rounded-2xl bg-muted/50 border border-border space-y-4">
                  <Textarea v-model="perModelReports[selectedModelReportIdx].handoffNotes"
                    placeholder="Notas de relevo para la siguiente persona..." class="h-32" />

                  <div class="space-y-3">
                    <div class="flex items-center justify-between">
                      <p class="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Spenders Principales</p>
                      <Button @click="addSpender(selectedModelReportIdx)" variant="ghost" size="sm"
                        class="h-6 text-[9px]">
                        <Plus class="w-3 h-3 mr-1" /> Añadir
                      </Button>
                    </div>
                    <div v-for="(sp, sIdx) in perModelReports[selectedModelReportIdx].spenders" :key="sIdx"
                      class="flex gap-2">
                      <Input v-model="sp.name" placeholder="Nombre" class="h-8 text-[11px]" />
                      <Input v-model="sp.username" placeholder="@user" class="h-8 text-[11px]" />
                      <Input v-model="sp.amount" placeholder="$" class="h-8 text-[11px] w-20" />
                      <Button v-if="perModelReports[selectedModelReportIdx].spenders.length > 1"
                        @click="removeSpender(selectedModelReportIdx, sIdx)" variant="ghost" size="icon"
                        class="h-8 w-8">
                        <X class="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <label class="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Observaciones Generales</label>
                  <span v-if="shiftTemplates.length" class="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Plantillas Rápidas</span>
                </div>

                <div v-if="shiftTemplates.length" class="flex flex-wrap gap-1.5 p-2 rounded-xl bg-muted/50 border border-border">
                  <button v-for="t in shiftTemplates" :key="t.id"
                    @click="observations = observations ? observations + '\n' + t.content : t.content"
                    class="px-2 py-1 rounded-md bg-background text-[10px] font-bold text-muted-foreground border border-border hover:border-primary/50 transition-all">
                    {{ t.name }}
                  </button>
                </div>

                <Textarea v-model="observations" placeholder="Escribe aquí las novedades más importantes..."
                  class="h-24" />
              </div>
            </div>
          </ScrollArea>

          <div class="p-8 bg-muted/30 border-t border-border grid grid-cols-2 gap-4">
            <Button @click="submitEndShift(false)" :variant="isForceExit ? 'destructive' : 'default'"
              class="h-12 font-black uppercase tracking-widest text-xs">
              {{ isForceExit ? 'Cerrar con alerta' : 'Finalizar Turno' }}
            </Button>
            <Button v-if="!isExtraHours" @click="submitEndShift(true)" variant="secondary"
              class="h-12 font-black uppercase tracking-widest text-xs">
              Cerrar e Iniciar Extras
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  </TooltipProvider>
</template>

<style scoped>
.font-sans {
  font-family: 'Plus Jakarta Sans', sans-serif;
}

/* Custom Scrollbar for a premium look */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(155, 155, 155, 0.1);
  border-radius: 10px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(155, 155, 155, 0.2);
}
</style>
