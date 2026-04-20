<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/api'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

// UI Primitives
import { ScrollArea } from '@/components/ui/scroll-area'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogScrollContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle, Plus, X, Play, Zap } from 'lucide-vue-next'
import ShiftModelReport from '@/components/dashboard/ShiftModelReport.vue'

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
import ModelReportsSection from '@/components/dashboard/ModelReportsSection.vue'

// Types
interface AssignedModel { id: number; name: string; alias?: string }
interface HistoryEntry {
  id: number; createdAt: string; type: string
  observations: string; earnings: number; growthPercentage: number
}
interface ModelExitReport {
  modelId: number
  modelName: string
  observations: string        // general notes about the shift with this model
  contentItems: string[]      // sold content tags e.g. ['mixto', 'foto en 4']
  spenders: { name: string; username: string; amount: string }[]
}

interface ModelReport {
  observations: string
  contentItems: string[]
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
const modelReports = ref<Record<number, ModelReport>>({})
const dailySummary = ref<any>(null)
const shiftStartTime = ref<string | null>(null)
const userAllSchedules = ref<any[]>([])

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

const dayTranslations: Record<string, string> = {
  'MONDAY': 'Lun', 'TUESDAY': 'Mar', 'WEDNESDAY': 'Mié', 'THURSDAY': 'Jue',
  'FRIDAY': 'Vie', 'SATURDAY': 'Sáb', 'SUNDAY': 'Dom'
}
const allDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']

const offDaysArray = computed(() => {
  const scheduledDays = userAllSchedules.value.map(s => s.dayOfWeek)
  if (scheduledDays.length === 0) return [] // Si no hay agenda cargada, no mostramos nada para evitar ruidos
  return allDays.filter(day => !scheduledDays.includes(day)).map(day => dayTranslations[day])
})

// --- Fetch Templates ---
async function fetchTemplates() {
  try {
    const res = await api.get('/shifts/templates/batch')
    shiftTemplates.value = res.data || []
  } catch (e) {
    console.error('Error fetching templates:', e)
  }
}

async function fetchUserAllSchedules() {
  if (!auth.user?.id) return
  try {
    const res = await api.get(`/admin/users/schedule/user/${auth.user.id}`)
    userAllSchedules.value = res.data || []
  } catch (e) { console.error('Error fetching schedules:', e) }
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

    // Build model reports from modelReports (from dashboard)
    const filteredReports = assignedModels.value
      .map(m => {
        const report = modelReports.value[m.id]
        if (!report) return null

        const hasContent = report.handoffNotes ||
          (report.contentItems && report.contentItems.length > 0) ||
          (report.spenders && report.spenders.some(s => s.name || s.username || s.amount))

        if (!hasContent) return null

        return {
          modelId: m.id,
          modelName: m.name,
          handoffNotes: report.handoffNotes || '',
          contentItems: report.contentItems || [],
          spenders: report.spenders || []
        }
      })
      .filter(r => r !== null)

    payload = {
      earnings: startEarnings.value, earningsMessages: startEarningsMessages.value,
      earningsTips: startEarningsTips.value, earningsPosts: startEarningsPosts.value,
      growthPercentage: startGrowthPercentage.value, observations: finalObs, force: isForceExit.value,
      modelReports: filteredReports.map(r => ({
        modelId: r.modelId,
        modelName: r.modelName,
        soldContentJson: JSON.stringify(r.contentItems),
        spendersJson: JSON.stringify(r.spenders.filter(s => s.name || s.username || s.amount))
      }))
    }

    const res = await fetch(`${apiUrl}/shifts/${currentShiftId.value}/end`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) })
    if (res.status === 412) { const e = await res.json(); toast.error(e.message || 'El turno está incompleto.'); showReportModal.value = false; return }
    if (!res.ok) throw new Error('Server error')

    // Save to logbook for handoff view
    if (filteredReports.length > 0) {
      const logbookEntries = filteredReports.map(r => ({
        ofModelId: r.modelId,
        shiftId: currentShiftId.value,
        message: r.handoffNotes || '',
        soldContentJson: JSON.stringify(r.contentItems),
        spendersJson: JSON.stringify(r.spenders.filter(s => s.name || s.username || s.amount))
      }))
      await fetch(`${apiUrl}/admin/models/logbook/batch`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(logbookEntries) }).catch(console.error)
    }

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
  perModelReports.value = assignedModels.value.map(m => {
    const saved = modelReports.value[m.id] || { observations: '', contentItems: [], spenders: [{ name: '', username: '', amount: '' }] }
    return {
      modelId: m.id,
      modelName: m.name,
      observations: saved.observations || '',
      contentItems: saved.contentItems?.length ? [...saved.contentItems] : [],
      spenders: saved.spenders?.length ? [...saved.spenders] : [{ name: '', username: '', amount: '' }],
    }
  })
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
  fetchUserAllSchedules()
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
    <div class="h-full flex bg-white dark:bg-zinc-900 text-foreground overflow-hidden font-sans select-none">

      <!-- Modular Sidebar -->
      <DashboardSidebar v-model:activeTab="activeTab" v-model:open="sidebarOpen" :is-marketing="isMarketing"
        :off-days="offDaysArray"
        @logout="auth.logout(); router.push({ name: 'login' })" />

      <main class="flex-1 flex flex-col min-w-0 relative overflow-hidden transition-colors duration-300 ">

        <!-- Modular Topbar -->
        <Topbar :active-tab="activeTab" :is-working="isWorking" :is-paused="isPaused" :status-label="statusLabel"
          :status-color="statusColor" :shift-target="missingShiftSeconds" @toggle-sidebar="sidebarOpen = !sidebarOpen"
          @start-shift="isExtraHoursSelection = $event; showStartModal = true" @toggle-break="toggleBreak"
          @end-shift="endShiftPrompt" />

        <div
          class="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 relative">
          <!-- Textura de grilla sutil -->
          <svg class="absolute inset-0 w-full h-full pointer-events-none opacity-[0.03]" viewBox="0 0 400 400" preserveAspectRatio="none">
            <defs>
              <pattern id="dashboard-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" stroke-width="0.4" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dashboard-grid)" class="text-foreground" />
          </svg>
          
          <div class="max-w-[1400px] mx-auto p-4 lg:p-8 space-y-8 relative z-10 transition-all min-h-full">

            <AnnouncementsBanner />

            <!-- Case: TRACKER -->
            <template v-if="activeTab === 'tracker'">
              <!-- Modular Stats Overview -->
              <StatsCards :shift-compliance-percent="shiftCompliancePercent" :work-time="workTime" :idle-time="idleTime"
                :break-time="breakTime" />

              <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Modular Tracker/Timer Card -->
                <TrackerCard :effective-work-seconds="effectiveWorkSeconds" :is-working="isWorking"
                  :is-paused="isPaused" :status-label="statusLabel" :status-dot="statusDot"
                  :shift-start-time="shiftStartTime ?? undefined" :daily-summary="dailySummary ?? undefined"
                  :schedule-info="userSchedule ?? undefined" @toggle-break="toggleBreak"
                  @start-shift="isExtraHoursSelection = $event; showStartModal = true" @end-shift="endShiftPrompt" />

                <!-- Modular Notes/Observations Card -->
                <NotesCard v-model="observations" />
              </div>

              <!-- Model Reports Section -->
              <ModelReportsSection v-model:model-reports="modelReports" :assigned-models="assignedModels"
                :is-working="isWorking" />

              <MarketingPanel v-if="isMarketing" ref="marketingPanelRef" />
            </template>

            <!-- Case: CONTEXT / BITACORA -->
            <template v-else-if="activeTab === 'context'">
              <div v-if="assignedModels.length > 0">
                <h2 class="text-lg font-bold text-foreground mb-4">Historial de Relevo</h2>
                <div class="flex gap-6 overflow-x-auto pb-4 -mx-4 px-4">
                  <div v-for="m in assignedModels" :key="m.id" class="flex-none w-96">
                    <ModelHandoffCard :model="{ name: m.name, alias: m.alias }" :entries="handoffData[m.id] || []" />
                  </div>
                </div>
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
        </div>
      </main>

      <!-- ── Modals ── -->
      <!-- Start Shift -->
      <Dialog v-model:open="showStartModal">
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Preparar Turno</DialogTitle>
            <DialogDescription>
              {{ isExtraHoursSelection ? 'Iniciando Horas Extras' : 'Iniciando Jornada Regular' }}
            </DialogDescription>
          </DialogHeader>
          <div class="space-y-4 py-2">
            <div class="space-y-2">
              <label class="text-xs font-medium text-muted-foreground">Facturación Inicial ($)</label>
              <Input type="number" v-model="startEarnings" placeholder="0.00" class="h-11 text-base font-bold" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" @click="showStartModal = false">Cancelar</Button>
            <Button @click="startShift(isExtraHoursSelection)">Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <!-- End Shift / Report -->
      <Dialog v-model:open="showReportModal">
        <DialogScrollContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle class="text-xl font-bold tracking-tight">Reporte de Turno</DialogTitle>
            <DialogDescription class="text-zinc-500 dark:text-zinc-400">
              Completá los datos para finalizar la sesión
            </DialogDescription>
          </DialogHeader>

          <div class="space-y-6 py-4">
            <!-- Force exit warning -->
            <div v-if="isForceExit"
              class="relative w-full rounded-lg border border-destructive/20 bg-destructive/10 p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-destructive">
              <AlertTriangle class="w-4 h-4" />
              <h5 class="mb-1 font-medium leading-none tracking-tight text-destructive">Cierre Anticipado</h5>
              <div class="text-sm [&_p]:leading-relaxed text-destructive/90 mb-3">
                Por favor, indicá la razón por la cual estás cerrando el turno antes de tiempo.
              </div>
              <Textarea v-model="emergencyReason" placeholder="Razón del cierre anticipado..."
                class="bg-background/50 border-destructive/30 focus-visible:ring-destructive/30 text-sm resize-none" />
            </div>

            <!-- Earnings -->
            <div class="grid gap-2">
              <Label for="earnings" class="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Facturación Neta ($)
              </Label>
              <Input id="earnings" type="number" v-model="startEarnings" placeholder="0"
                class="h-14 text-3xl font-black bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600 transition-all" />
            </div>

            <!-- General Observations -->
            <div class="grid gap-2">
              <Label for="observations" class="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Observaciones Generales
              </Label>
              <Textarea id="observations" v-model="observations" placeholder="Notas generales sobre el turno..."
                class="min-h-[120px] text-sm resize-none bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600 transition-all" />
            </div>
          </div>

          <DialogFooter class="flex flex-col sm:flex-row gap-2">
            <Button v-if="!isExtraHours && !isForceExit" @click="submitEndShift(true)" variant="secondary"
              class="w-full sm:w-auto order-2 sm:order-1">
              Cerrar e Iniciar Extras
            </Button>
            <Button @click="submitEndShift(false)" :variant="isForceExit ? 'destructive' : 'default'"
              class="w-full sm:w-auto text-white order-1 sm:order-2 font-bold shadow-lg shadow-primary/20">
              Finalizar Turno
            </Button>
          </DialogFooter>
        </DialogScrollContent>
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
