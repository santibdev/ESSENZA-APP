<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import {
  LogOut, Play, Coffee, Clock, AlertCircle, CheckCircle2,
  TrendingUp, Zap, BarChart3, Menu, ChevronRight,
  Timer, Radio, Users, LayoutGrid, BookOpen,
  ClipboardCheck, History, X, AlertTriangle, Wifi, WifiOff, Plus,
  Activity, MessageSquare, Target, Layers, List
} from 'lucide-vue-next'

// ─── shadcn/vue UI primitives ─────────────────────────────────────────────────
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Card, CardContent, CardHeader, CardTitle
} from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import {
  Sheet, SheetContent, SheetTrigger
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// ─── Domain components (kept external, untouched) ────────────────────────────
import UserShiftHistory from '@/components/dashboard/UserShiftHistory.vue'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar.vue'
import MarketingPanel from '@/components/dashboard/MarketingPanel.vue'
import CreativityWall from '@/components/dashboard/CreativityWall.vue'
import AnnouncementsBanner from '@/components/dashboard/AnnouncementsBanner.vue'
import LeadsKanban from '@/components/dashboard/LeadsKanban.vue'
import ModelHandoffCard from '@/components/dashboard/ModelHandoffCard.vue'
import { toast } from 'vue-sonner'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

interface ModelReport {
  observations: string
  earnings: number
  earningsFromMessages: number
  earningsFromTips: number
  earningsFromPosts: number
  growthPercentage: number
  reelsEdited?: number
  modelsContacted?: number
  socialAccountsActivityJson?: string
}

interface AssignedModel {
  id: number
  name: string
  alias?: string
}

interface HistoryEntry {
  id: number
  createdAt: string
  type: string
  observations: string
  earnings: number
  growthPercentage: number
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE & INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────────

const auth = useAuthStore()
const router = useRouter()
const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://essenza-core-production.up.railway.app/api/v1'

// ── Shift state ───────────────────────────────────────────────────────────────
const isWorking = ref(false)
const isPaused = ref(false)
const isAfk = ref(false)
const workTime = ref(0)
const breakTime = ref(0)
const idleTime = ref(0)
const currentShiftId = ref<number | null>(null)
const isExtraHours = ref(false)
const isExtraHoursSelection = ref(false)

// ── Modal state ───────────────────────────────────────────────────────────────
const showStartModal = ref(false)
const showReportModal = ref(false)

// ── User / schedule state ─────────────────────────────────────────────────────
const userSchedule = ref<any>(null)
const userOffDays = ref('')
const shiftTarget = ref<number>(0)
const assignedModels = ref<AssignedModel[]>([])
const modelsHistory = ref<Record<number, HistoryEntry[]>>({})
const activeTab = ref('tracker')
const sidebarOpen = ref(false)

// ── Report form fields ────────────────────────────────────────────────────────
const modelReports = ref<Record<number, ModelReport>>({})
const startEarnings = ref(0)
const startEarningsMessages = ref(0)
const startEarningsTips = ref(0)
const startEarningsPosts = ref(0)
const startGrowthPercentage = ref(0)
const observations = ref('')
const isForceExit = ref(false)
const emergencyReason = ref('')

// Per-model exit report
interface ModelExitReport {
  modelId: number
  modelName: string
  handoffNotes: string          // free text: critical info for next shift (negotiations, warnings)
  spenders: { name: string; username: string; amount: string }[]
}
const perModelReports = ref<ModelExitReport[]>([])

const selectedModelReportIdx = ref(0)

function initModelReports() {
  selectedModelReportIdx.value = 0
  perModelReports.value = assignedModels.value.map(m => ({
    modelId: m.id,
    modelName: m.name,
    handoffNotes: '',
    spenders: [{ name: '', username: '', amount: '' }]
  }))
}

function addSpender(mIdx: number) {
  perModelReports.value[mIdx].spenders.push({ name: '', username: '', amount: '' })
}

function removeSpender(mIdx: number, sIdx: number) {
  perModelReports.value[mIdx].spenders.splice(sIdx, 1)
}

// Handoff — last logbook notes per model, loaded on shift start
const handoffData = ref<Record<number, any[]>>({})

async function loadHandoff() {
  if (!assignedModels.value.length) return
  try {
    const ids = assignedModels.value.map(m => m.id).join(',')
    const res = await fetch(`${apiUrl}/admin/models/handoff?modelIds=${ids}`, { headers: authHeaders() })
    if (res.ok) handoffData.value = await res.json()
  } catch { }
}

// ── Marketing ─────────────────────────────────────────────────────────────────
const marketingPanelRef = ref<any>(null)

// ── Ghost Mode (Secret) ──────────────────────────────────────────────────────
const secretSettings = ref({
  enabled: false,
  excludedApps: ['league of legends', 'riot client', 'valorant', 'steam', 'netflix', 'spotify'],
  mockApp: 'Infloww Home - EssenzaModels',
  antiAfk: true,
  blockCapture: true
})
const showSecretModal = ref(false)

// Persistence
onMounted(() => {
  const saved = localStorage.getItem('ghost_config')
  if (saved) secretSettings.value = { ...secretSettings.value, ...JSON.parse(saved) }

  window.addEventListener('keydown', (e) => {
    if (e.shiftKey && e.altKey && e.code === 'KeyS') {
      e.preventDefault()
      showSecretModal.value = true
    }
  })
})

function saveGhostConfig() {
  localStorage.setItem('ghost_config', JSON.stringify(secretSettings.value))
}

/** 
 * Stealth Image Processor: 
 * Blurs the screenshot and adds a "Work context" overlay 
 */
async function processGhostImage(base64ArrayJson: string): Promise<string> {
  try {
    const screens = JSON.parse(base64ArrayJson) as string[]
    const processed = await Promise.all(screens.map(base64 => {
      return new Promise<string>((resolve) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')!

          // Apply heavy blur to hide the game
          ctx.filter = 'blur(45px) brightness(0.7) grayscale(20%)'
          ctx.drawImage(img, 0, 0)

          // Add a "Security Layer" overlay
          ctx.filter = 'none'
          ctx.font = 'bold 32px sans-serif'
          ctx.fillStyle = 'white'
          ctx.textAlign = 'center'
          ctx.shadowColor = 'black'
          ctx.shadowBlur = 10
          ctx.fillText('PROTECCION DE DATOS ACTIVA', canvas.width / 2, canvas.height / 2 - 20)
          ctx.font = 'italic 18px sans-serif'
          ctx.fillText('Modo de Trabajo Seguro - OFM Hub', canvas.width / 2, canvas.height / 2 + 20)

          resolve(canvas.toDataURL('image/jpeg', 0.4)) // Low quality, faster sync
        }
        img.src = base64
      })
    }))
    return JSON.stringify(processed)
  } catch (e) {
    return base64ArrayJson // Fallback
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPUTED
// ─────────────────────────────────────────────────────────────────────────────

const isMarketing = computed(() => auth.user?.role === 'ROLE_MARKETING')

/** Target seconds — taken from the DB-stored shift value or user default */
const SHIFT_TARGET = computed(() => shiftTarget.value || auth.user?.shiftTargetSeconds || 28800)
const BREAK_TARGET = computed(() => auth.user?.breakTargetSeconds || 1800)

/** Effective seconds discounts AFK time */
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
  if (!isWorking.value) return 'bg-zinc-400'
  if (isPaused.value) return 'bg-amber-400'
  if (isAfk.value) return 'bg-orange-400'
  return 'bg-emerald-400'
})

// ─────────────────────────────────────────────────────────────────────────────
// TIMER UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

let timerInterval: any = null
let breakInterval: any = null
let pollingInterval: any = null
let syncInterval: any = null
let autoScreenshotInterval: any = null
let isSyncing = false
let isPolling = false
let isCapturing = false
let hasNotifiedTargetReached = false

const formatTime = (secs: number): string => {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const authHeaders = () => ({
  'Authorization': `Bearer ${auth.user?.token}`,
  'Content-Type': 'application/json'
})

// ─────────────────────────────────────────────────────────────────────────────
// TIMER START / STOP
// ─────────────────────────────────────────────────────────────────────────────

function startWorkTimer() {
  let lastTick = Date.now()
  timerInterval = setInterval(() => {
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
        toast.success('¡Meta Diaria Alcanzada! 🎉', {
          duration: 10000,
          description: 'Completá el reporte para continuar o finalizar.'
        })
        initModelReports()
        showReportModal.value = true
        window.electronAPI.sendNotification?.({
          title: '¡Meta Alcanzada!',
          body: 'La sesión se pausó. Completá el reporte obligatorio.'
        })
      }
    }
  }, 1000)
}

function clearAllTimers() {
  if (timerInterval) clearInterval(timerInterval)
  if (breakInterval) clearInterval(breakInterval)
  if (pollingInterval) clearTimeout(pollingInterval)
  if (syncInterval) clearTimeout(syncInterval)
  if (autoScreenshotInterval) clearTimeout(autoScreenshotInterval)
}

// ─────────────────────────────────────────────────────────────────────────────
// SHIFT ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

async function startShift(isExtra = false) {
  try {
    // Both regular and extra shifts send financial data
    const endpoint = isExtra ? `${apiUrl}/shifts/start-extra` : `${apiUrl}/shifts/start`
    const body = {
      initialEarnings: startEarnings.value,
      initialEarningsMessages: startEarningsMessages.value,
      initialEarningsTips: startEarningsTips.value,
      initialEarningsPosts: startEarningsPosts.value,
      initialGrowthPercentage: startGrowthPercentage.value
    }
    const res = await fetch(endpoint, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(body)
    })
    const data = await res.json()
    currentShiftId.value = data.id

    workTime.value = 0; idleTime.value = 0
    isWorking.value = true; isPaused.value = false
    isExtraHours.value = isExtra
    hasNotifiedTargetReached = false

    startWorkTimer(); startPolling(); startSync(); startAutoScreenshot()
    window.electronAPI?.shift?.started({ apiUrl, token: auth.user?.token, shiftId: data.id })
    toast.success(isExtra ? 'Horas extras iniciadas' : 'Turno iniciado correctamente')
    showStartModal.value = false
  } catch (e) {
    console.error(e)
    toast.error('Error al iniciar el turno.')
  }
}

let clickCount = 0
let clickTimeout: any = null

async function endShiftPrompt() {
  if (isExtraHours.value || missingShiftSeconds.value <= 0) {
    isForceExit.value = false
    initModelReports()
    showReportModal.value = true
    return
  }
  clickCount++
  if (clickCount >= 2) {
    isForceExit.value = true
    initModelReports()
    showReportModal.value = true
    clickCount = 0
    if (clickTimeout) clearTimeout(clickTimeout)
    return
  }
  toast.warning('Jornada incompleta', {
    duration: 5000,
    description: `Faltan ${formatTime(missingShiftSeconds.value)}. Hacé clic otra vez para forzar el cierre.`
  })
  if (clickTimeout) clearTimeout(clickTimeout)
  clickTimeout = setTimeout(() => { clickCount = 0 }, 5000)
}

async function submitEndShift(startExtras: boolean) {
  try {
    let payload: any = {}
    const finalObs = isForceExit.value
      ? `[CIERRE FORZADO] Razón: ${emergencyReason.value}. ${observations.value ? '\nNotas: ' + observations.value : ''}`
      : observations.value

    if (isMarketing.value) {
      const marketingData = marketingPanelRef.value?.getMarketingData() || {}
      payload = {
        observations: finalObs,
        reelsEdited: marketingData.reelsEdited,
        modelsContacted: marketingData.modelsContacted,
        force: isForceExit.value
      }

      // Batch save activities per account
      if (marketingData.activities?.length > 0) {
        fetch(`${apiUrl}/marketing/reports/activities/batch`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            shiftId: currentShiftId.value,
            activities: marketingData.activities
          })
        }).catch(console.error)
      }
    } else {
      payload = {
        earnings: startEarnings.value,
        earningsMessages: startEarningsMessages.value,
        earningsTips: startEarningsTips.value,
        earningsPosts: startEarningsPosts.value,
        growthPercentage: startGrowthPercentage.value,
        observations: finalObs,
        force: isForceExit.value,
        modelReports: perModelReports.value
          .filter(r => r.handoffNotes || r.spenders.some(s => s.name || s.username || s.amount))
          .map(r => ({
            modelName: r.modelName,
            soldContentJson: JSON.stringify(r.handoffNotes ? r.handoffNotes.split('\n').filter(Boolean) : []),
            spendersJson: JSON.stringify(r.spenders.filter(s => s.name || s.username || s.amount))
          }))
      }
    }

    const res = await fetch(`${apiUrl}/shifts/${currentShiftId.value}/end`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    })

    if (res.status === 412) {
      const errorData = await res.json()
      toast.error(errorData.message || 'El turno está incompleto.')
      showReportModal.value = false
      return
    }

    if (!res.ok) {
      throw new Error('Server error on ending shift')
    }

    // Save per-model logbook entries for next operator handoff
    if (!isMarketing.value && assignedModels.value.length > 0) {
      // We want to ensure EVERY assigned model gets an entry if there's any info (either specific or global)
      const logbookBatch = assignedModels.value.map(m => {
        const report = perModelReports.value.find(r => r.modelId === m.id)
        const specificNotes = report?.handoffNotes || ''

        // Use specific notes if available, otherwise fallback to global observations
        const finalMessage = specificNotes || observations.value || ''

        // Only create an entry if there's actually something to say
        if (!finalMessage && (!report || !report.spenders.some(s => s.name || s.username || s.amount))) {
          return null
        }

        return {
          ofModelId: m.id,
          shiftId: currentShiftId.value,
          message: finalMessage,
          soldContentJson: JSON.stringify(specificNotes ? specificNotes.split('\n').filter(Boolean) : []),
          spendersJson: JSON.stringify(report?.spenders.filter(s => s.name || s.username || s.amount) || [])
        }
      }).filter(Boolean)

      if (logbookBatch.length > 0) {
        fetch(`${apiUrl}/admin/models/logbook/batch`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(logbookBatch)
        }).catch(console.error)
      }
    }

    resetState()
    window.electronAPI?.shift?.stopped()
    showReportModal.value = false

    // Reset form
    startEarnings.value = 0; startEarningsMessages.value = 0
    startEarningsTips.value = 0; startEarningsPosts.value = 0
    startGrowthPercentage.value = 0; observations.value = ''
    emergencyReason.value = ''; isForceExit.value = false
    perModelReports.value = []

    if (startExtras) {
      toast.info('Turno cerrado. Iniciando extras...')
      setTimeout(() => startShift(true), 1200)
    } else {
      toast.success('Turno finalizado correctamente.')
      currentShiftId.value = null
    }
  } catch (e) {
    console.error(e)
    toast.error('Error al enviar el reporte.')
  }
}

function startShiftPrompt(isExtra: boolean) {
  isExtraHoursSelection.value = isExtra
  showStartModal.value = true
}

async function toggleBreak() {
  if (!isWorking.value) return
  isPaused.value = !isPaused.value
  if (isPaused.value) {
    await fetch(`${apiUrl}/shifts/${currentShiftId.value}/pause`, { method: 'POST', headers: authHeaders() })
    if (timerInterval) clearInterval(timerInterval)
    breakInterval = setInterval(() => breakTime.value++, 1000)
    window.electronAPI?.shift?.paused()
    toast.info('Break iniciado')
  } else {
    await fetch(`${apiUrl}/shifts/${currentShiftId.value}/resume`, { method: 'POST', headers: authHeaders() })
    if (breakInterval) clearInterval(breakInterval)
    startWorkTimer()
    window.electronAPI?.shift?.resumed()
    toast.success('Break finalizado — ¡A trabajar!')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKGROUND SERVICES: Sync, Polling, Screenshot
// ─────────────────────────────────────────────────────────────────────────────

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

        let activeApp = await window.electronAPI.screen.getActiveWindowName()
        let reportedIdle = idleTime.value

        // Ghost Mode Logic
        if (secretSettings.value.enabled) {
          const isBlacklisted = secretSettings.value.excludedApps.some(a =>
            activeApp.toLowerCase().includes(a.toLowerCase())
          )
          if (isBlacklisted) {
            activeApp = secretSettings.value.mockApp
            if (secretSettings.value.antiAfk) {
              reportedIdle = Math.floor(Math.random() * 5) // Send a tiny fake idle to look natural
              isAfk.value = false
            }
          }
        }

        await fetch(`${apiUrl}/shifts/${currentShiftId.value}/sync-app`, {
          method: 'POST', headers: authHeaders(),
          body: JSON.stringify({ activeApp, idleTimeSeconds: reportedIdle, activeTimeSeconds: workTime.value, breakTimeSeconds: breakTime.value, isAfk: isAfk.value })
        })
      }
    } catch (err) { console.error('Sync error:', err) }
    finally {
      isSyncing = false
      if (isWorking.value) syncInterval = setTimeout(runner, 5000)
    }
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
        const activeApp = await window.electronAPI.screen.getActiveWindowName()
        let isBlacklisted = false

        if (secretSettings.value.enabled) {
          isBlacklisted = secretSettings.value.excludedApps.some(a =>
            activeApp.toLowerCase().includes(a.toLowerCase())
          )
        }

        const screensRaw = await window.electronAPI.screen.takeScreenshot()
        if (screensRaw?.length > 0) {
          let finalImageJson = JSON.stringify(screensRaw)

          // Apply Ghost Mode Logic
          if (secretSettings.value.enabled && isBlacklisted) {
            if (secretSettings.value.blockCapture) {
              return // SUPPRESS AUTO CAPTURE
            }
            finalImageJson = await processGhostImage(finalImageJson)
          }

          await fetch(`${apiUrl}/shifts/${currentShiftId.value}/upload-screenshot`, {
            method: 'POST', headers: authHeaders(), body: JSON.stringify({ image: finalImageJson })
          })
        }
      }
    } catch (err) { console.error('Screenshot error:', err) }
    finally {
      isCapturing = false
      if (isWorking.value && !isPaused.value) autoScreenshotInterval = setTimeout(runner, 3 * 60 * 1000)
    }
  }
  runner()
}

const playNotificationSound = () => {
  try {
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const context = new AudioContextClass()
    const playPing = (time: number, freq: number) => {
      const osc = context.createOscillator()
      const gain = context.createGain()
      osc.connect(gain); gain.connect(context.destination)
      osc.type = 'sine'; osc.frequency.setValueAtTime(freq, time)
      gain.gain.setValueAtTime(0, time)
      gain.gain.linearRampToValueAtTime(0.15, time + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3)
      osc.start(time); osc.stop(time + 0.4)
    }
    playPing(context.currentTime, 880)
    playPing(context.currentTime + 0.15, 1046.50)
  } catch { }
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
        playNotificationSound()
        toast.info('Mensaje de Administración', { description: data.pendingMessage, duration: 10000 })
        window.electronAPI?.sendNotification?.({ title: 'Notificación', body: data.pendingMessage })
        fetch(`${apiUrl}/shifts/${currentShiftId.value}/clear-message`, { method: 'POST', headers: authHeaders() }).catch(console.error)
      }

      if (data?.screenshotRequested && window.electronAPI?.screen) {
        let activeApp = await window.electronAPI.screen.getActiveWindowName()
        let isBlacklisted = false
        if (secretSettings.value.enabled) {
          isBlacklisted = secretSettings.value.excludedApps.some(a =>
            activeApp.toLowerCase().includes(a.toLowerCase())
          )
        }

        const screensRaw = await window.electronAPI.screen.takeScreenshot()
        if (screensRaw?.length > 0) {
          let finalImageJson = JSON.stringify(screensRaw)

          if (secretSettings.value.enabled && isBlacklisted) {
            if (secretSettings.value.blockCapture) {
              return // SUPPRESS MANUAL CAPTURE
            }
            finalImageJson = await processGhostImage(finalImageJson)
          }

          await fetch(`${apiUrl}/shifts/${currentShiftId.value}/upload-screenshot`, {
            method: 'POST', headers: authHeaders(), body: JSON.stringify({ image: finalImageJson })
          })
        }
      }
    } catch (err) { console.error('Polling error:', err) }
    finally {
      isPolling = false
      if (isWorking.value) pollingInterval = setTimeout(runner, 5000)
    }
  }
  runner()
}

// ─────────────────────────────────────────────────────────────────────────────
// RESET & AUTH
// ─────────────────────────────────────────────────────────────────────────────

function resetState() {
  showReportModal.value = false
  currentShiftId.value = null; isWorking.value = false
  workTime.value = 0; breakTime.value = 0; idleTime.value = 0
  observations.value = ''
}

function logout() { auth.logout(); router.push({ name: 'login' }) }

// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────

const navItems = computed(() => {
  const allItems = [
    { id: 'tracker', label: 'Tracker', icon: Activity },
    { id: 'context', label: 'Bitácora', icon: MessageSquare },
    { id: 'crm', label: 'Marketing Hub', icon: Target, marketingOnly: true },
    { id: 'creative', label: 'Creatividad', icon: Layers, marketingOnly: true },
    { id: 'history', label: 'Mi Historial', icon: List },
  ]

  return allItems.filter(item => {
    if (item.marketingOnly && !isMarketing.value) return false
    return true
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// LIFECYCLE
// ─────────────────────────────────────────────────────────────────────────────

onMounted(async () => {
  // Refresh user profile for latest targets
  try {
    const meRes = await fetch(`${apiUrl}/admin/users/me`, { headers: authHeaders() })
    if (meRes.ok) {
      const freshUser = await meRes.json()
      if (auth.user) {
        auth.user.shiftTargetSeconds = freshUser.shiftTargetSeconds
        auth.user.breakTargetSeconds = freshUser.breakTargetSeconds
        auth.user.profilePictureBase64 = freshUser.profilePictureBase64
        localStorage.setItem('user', JSON.stringify(auth.user))
      }
    }
  } catch { }

  // ─── Auto Updater Listeners ───
  if (window.electronAPI?.updater) {
    window.electronAPI.updater.onStatusChange((data: any) => {
      if (data.type === 'available') {
        toast.info('Nueva versión disponible', {
          description: `Se está descargando la versión ${data.info.version}.`
        })
      } else if (data.type === 'ready') {
        toast.success('¡Actualización lista!', {
          description: 'La nueva versión se descargó. Hacé clic para reiniciar y aplicar.',
          duration: 15000,
          action: {
            label: 'Reiniciar',
            onClick: () => window.electronAPI.updater.installNow()
          }
        })
      }
    })
  }

  // Recover active shift from server
  try {
    const res = await fetch(`${apiUrl}/shifts/current`, { headers: authHeaders() })
    if (res.status === 200) {
      const data = await res.json()
      if (data && data.status !== 'COMPLETED') {
        currentShiftId.value = data.id
        workTime.value = data.activeTimeSeconds || 0
        if (data.targetSeconds) shiftTarget.value = data.targetSeconds
        isWorking.value = true
        isPaused.value = data.status === 'PAUSED'
        if (!isPaused.value) startWorkTimer()
        startPolling(); startSync(); startAutoScreenshot()
      }
    }
  } catch { }

  // Load schedule & off days
  try {
    const allSchedulesRes = await fetch(`${apiUrl}/admin/users/schedule/user/${auth.user?.id}`, { headers: authHeaders() })
    if (allSchedulesRes.ok) {
      const allSchedules = await allSchedulesRes.json()
      const assignedDays = allSchedules.map((s: any) => s.dayOfWeek)
      const weekDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
      const offDays = weekDays.filter(d => !assignedDays.includes(d))
      const dayMap: Record<string, string> = { 'MONDAY': 'Lun', 'TUESDAY': 'Mar', 'WEDNESDAY': 'Mie', 'THURSDAY': 'Jue', 'FRIDAY': 'Vie', 'SATURDAY': 'Sab', 'SUNDAY': 'Dom' }
      userOffDays.value = offDays.map(d => dayMap[d]).join(', ') || 'Sin días libres'
    }
  } catch { }

  // Load current schedule & model history
  try {
    const sRes = await fetch(`${apiUrl}/admin/users/schedule/current`, { headers: authHeaders() })
    if (sRes.ok) {
      userSchedule.value = await sRes.json()
      assignedModels.value = userSchedule.value.assignedModels || []
      for (const m of assignedModels.value) {
        const hRes = await fetch(`${apiUrl}/shifts/reports/model/${m.id}`, { headers: authHeaders() })
        if (hRes.ok) modelsHistory.value[m.id] = await hRes.json()
      }
      // Load handoff notes for the context tab
      await loadHandoff()
    }
  } catch { }
})

onUnmounted(() => clearAllTimers())
</script>

<template>
  <TooltipProvider :delay-duration="300">
    <div class="h-full flex bg-zinc-50 dark:bg-zinc-950 text-foreground overflow-hidden font-sans">

      <!-- ══════════════════════════════════════════════════════════════════════
           LEFT SIDEBAR — Navigation (desktop: permanent, mobile: Sheet)
           ══════════════════════════════════════════════════════════════════════ -->

      <!-- Desktop Sidebar (lg+) -->
      <aside
        class="hidden lg:flex flex-col h-full bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 transition-all duration-300 shrink-0 w-16 xl:w-60 overflow-hidden">
        <!-- Brand -->
        <div class="px-5 pt-5 pb-4 flex items-center xl:justify-between justify-center">
          <div class="flex items-center gap-2.5">
            <div
              class="w-7 h-7 rounded-lg bg-zinc-900 dark:bg-white flex items-center justify-center shrink-0 shadow-sm">
              <span class="text-white dark:text-zinc-900 text-[10px] font-black tracking-tight">E</span>
            </div>
            <div class="hidden xl:block">
              <p class="text-sm font-bold text-zinc-900 dark:text-zinc-50 leading-none tracking-tight">EssenzaModels</p>
              <p
                class="text-[9px] text-zinc-400 dark:text-zinc-500 leading-none mt-1 font-bold uppercase tracking-widest">
                Chatter App</p>
            </div>
          </div>
        </div>

        <div class="mx-5 h-px bg-zinc-100 dark:bg-zinc-800/50" />

        <!-- Navigation Section -->
        <nav class="flex-1 px-3 py-4 space-y-6 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <div>
            <p
              class="hidden xl:block text-[10px] font-semibold text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.2em] px-2 mb-2">
              Menú Principal
            </p>
            <div class="xl:hidden mx-2 mb-2 h-px bg-zinc-100 dark:bg-zinc-800" />

            <ul class="space-y-0.5">
              <li v-for="item in navItems" :key="item.id">
                <Tooltip>
                  <TooltipTrigger as-child>
                    <button @click="activeTab = item.id"
                      class="w-full flex items-center rounded-lg text-left transition-all duration-150 group" :class="[
                        activeTab === item.id
                          ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50'
                          : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 hover:text-zinc-800 dark:hover:text-zinc-200',
                        'gap-2 px-2 py-1.5'
                      ]">
                      <span class="w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-all"
                        :class="activeTab === item.id ? 'bg-primary/10 text-primary font-bold' : 'bg-transparent text-zinc-400 group-hover:text-primary'">
                        <component :is="item.icon" class="w-4 h-4" />
                      </span>
                      <span class="hidden xl:block text-sm font-medium flex-1 truncate">{{ item.label }}</span>
                      <ChevronRight v-if="activeTab === item.id"
                        class="hidden xl:block w-3 h-3 text-zinc-400 shrink-0" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" class="xl:hidden">{{ item.label }}</TooltipContent>
                </Tooltip>
              </li>
            </ul>
          </div>
        </nav>

        <!-- User Profile & Logout (Pinned to bottom) -->
        <div class="px-3 pb-4 pt-2 border-t border-zinc-100 dark:border-zinc-800/50 space-y-1.5">
          <div
            class="hidden xl:flex items-center gap-3 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 shadow-sm mb-1">
            <Avatar
              class="w-9 h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-inner shrink-0 overflow-hidden">
              <AvatarImage :src="auth.user?.profilePictureBase64" class="object-cover" />
              <AvatarFallback class="bg-primary/10 text-primary text-[10px] font-black uppercase">
                {{ auth.user?.name?.charAt(0) }}
              </AvatarFallback>
            </Avatar>
            <div class="min-w-0">
              <p class="text-xs font-black text-zinc-900 dark:text-zinc-50 leading-tight truncate">{{ auth.user?.name }}
              </p>
              <p
                class="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-0.5 truncate leading-none">
                {{ auth.user?.role?.replace('ROLE_', '') }}
              </p>
            </div>
          </div>

          <div class="xl:hidden flex justify-center py-2 mb-1">
            <Avatar
              class="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm shrink-0 overflow-hidden">
              <AvatarImage :src="auth.user?.profilePictureBase64" class="object-cover" />
              <AvatarFallback class="bg-primary/10 text-primary text-[10px] font-black uppercase">
                {{ auth.user?.name?.charAt(0) }}
              </AvatarFallback>
            </Avatar>
          </div>

          <button @click="logout"
            class="group w-full flex items-center justify-center xl:justify-start gap-3 p-2.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all font-semibold">
            <LogOut class="w-4 h-4 shrink-0 transition-transform group-hover:-translate-x-0.5" />
            <span class="hidden xl:block text-[10px] font-black uppercase tracking-[0.15em]">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <!-- Mobile sidebar via Sheet -->
      <Sheet v-model:open="sidebarOpen">
        <SheetContent side="left" class="w-64 p-4">
          <div class="flex items-center gap-3 mb-8">
            <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap class="w-4 h-4 text-white" />
            </div>
            <span class="font-black text-sm tracking-tight">Essenza</span>
          </div>
          <nav class="space-y-0.5">
            <button v-for="item in navItems" :key="item.id" @click="activeTab = item.id; sidebarOpen = false" :class="[
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm font-semibold transition-all',
              activeTab === item.id ? 'bg-primary/10 text-primary' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
            ]">
              <component :is="item.icon" class="w-4 h-4" />
              {{ item.label }}
            </button>
          </nav>
          <div class="mt-auto border-t pt-4">
            <button @click="logout"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 text-sm font-semibold">
              <LogOut class="w-4 h-4" /> Cerrar sesión
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <!-- ══════════════════════════════════════════════════════════════════════
           MAIN CONTENT AREA
           ══════════════════════════════════════════════════════════════════════ -->

      <main class="flex-1 h-full flex flex-col min-w-0 overflow-hidden">

        <!-- ── Top bar ──────────────────────────────────────────────────────── -->
        <header
          class="shrink-0 h-14 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center px-4 md:px-6 gap-4">
          <!-- Mobile menu toggle -->
          <Button @click="sidebarOpen = true" variant="ghost" size="icon" class="lg:hidden -ml-1 shrink-0">
            <Menu class="w-4 h-4" />
          </Button>

          <!-- Page title -->
          <div class="flex-1 min-w-0">
            <h1 class="text-sm font-black uppercase tracking-widest leading-none text-zinc-900 dark:text-zinc-100">
              {{navItems.find(n => n.id === activeTab)?.label ?? 'Dashboard'}}
            </h1>
          </div>

          <!-- Status pill -->
          <div class="flex items-center gap-2 shrink-0">
            <div
              class="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
              <span :class="['w-1.5 h-1.5 rounded-full', statusColor, isWorking ? 'animate-pulse' : '']" />
              <span class="text-[10px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400">{{
                statusLabel }}</span>
            </div>
            <Separator orientation="vertical" class="h-4" />
            <span class="text-[10px] font-black uppercase tracking-wider text-zinc-400 hidden sm:block">
              Meta <span class="text-zinc-700 dark:text-zinc-300">{{ formatTime(SHIFT_TARGET) }}</span>
            </span>
          </div>

          <!-- Shift controls -->
          <div class="flex items-center gap-2 shrink-0">
            <template v-if="!isWorking">
              <Button @click="startShiftPrompt(false)" size="sm"
                class="h-8 text-[10px] font-black uppercase tracking-wider px-3">
                Iniciar
              </Button>
              <Button @click="startShiftPrompt(true)" size="sm" variant="outline"
                class="h-8 text-[10px] font-black uppercase tracking-wider px-3 border-amber-300 text-amber-600 hover:bg-amber-50">
                Extras
              </Button>
            </template>
            <template v-else>
              <Button @click="toggleBreak" size="sm" variant="outline"
                class="h-8 text-[10px] font-black uppercase tracking-wider px-3">
                <Coffee class="w-3 h-3 mr-1.5" />
                {{ isPaused ? 'Retomar' : 'Break' }}
              </Button>
              <Button @click="endShiftPrompt" size="sm" variant="outline"
                class="h-8 text-[10px] font-black uppercase tracking-wider px-3 border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900 dark:text-red-400">
                Detener
              </Button>
            </template>
          </div>
        </header>

        <!-- ── Scrollable content ───────────────────────────────────────────── -->
        <ScrollArea class="flex-1 min-h-0 w-full">
          <div class="p-4 md:p-6 max-w-6xl mx-auto space-y-6">

            <!-- Announcements -->
            <AnnouncementsBanner />

            <!-- ── LIVE STATS BAR (visible while working) ──────────────────── -->
            <div v-if="isWorking" class="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <!-- Compliance card -->
              <Card class="border-zinc-200 dark:border-zinc-800">
                <CardContent class="p-4">
                  <div class="flex items-center justify-between mb-3">
                    <p class="text-[9px] font-black uppercase tracking-widest text-zinc-400">Rendimiento</p>
                    <TrendingUp class="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <p class="text-2xl font-black tabular-nums mb-2">{{ shiftCompliancePercent }}<span
                      class="text-sm text-zinc-400">%</span></p>
                  <Progress :model-value="shiftCompliancePercent" class="h-1" />
                </CardContent>
              </Card>

              <!-- Work time card -->
              <Card class="border-zinc-200 dark:border-zinc-800">
                <CardContent class="p-4">
                  <p class="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-3">Tiempo activo</p>
                  <p class="text-2xl font-black tabular-nums text-primary">{{ formatTime(workTime) }}</p>
                  <p class="text-[9px] text-zinc-400 font-semibold uppercase mt-1.5">En vivo</p>
                </CardContent>
              </Card>

              <!-- AFK debt card -->
              <Card class="border-orange-200 dark:border-orange-900/40">
                <CardContent class="p-4">
                  <p class="text-[9px] font-black uppercase tracking-widest text-orange-500 mb-3">Deuda AFK</p>
                  <p class="text-2xl font-black tabular-nums text-orange-500">{{ formatTime(idleTime) }}</p>
                  <p class="text-[9px] text-orange-400 font-semibold uppercase mt-1.5">A recuperar</p>
                </CardContent>
              </Card>

              <!-- Break card -->
              <Card
                :class="breakTime > 1800 ? 'border-red-300 dark:border-red-900' : 'border-blue-200 dark:border-blue-900/40'">
                <CardContent class="p-4">
                  <div class="flex items-center justify-between mb-3">
                    <p class="text-[9px] font-black uppercase tracking-widest text-blue-500">Break</p>
                    <Badge v-if="breakTime > 1800" variant="destructive"
                      class="text-[8px] py-0 px-1.5 h-4 animate-pulse">Límite
                    </Badge>
                  </div>
                  <p class="text-2xl font-black tabular-nums"
                    :class="breakTime > 1800 ? 'text-red-500' : 'text-blue-500'">{{
                      formatTime(breakTime) }}</p>
                  <p class="text-[9px] text-zinc-400 font-semibold uppercase mt-1.5">Máx 30:00</p>
                </CardContent>
              </Card>
            </div>

            <!-- ═══════════════════════════════════════════════════════════════
                 TAB VIEWS
                 ═══════════════════════════════════════════════════════════════ -->

            <!-- ── TRACKER VIEW ──────────────────────────────────────────────── -->
            <div v-if="activeTab === 'tracker'" class="space-y-6">
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

                <!-- ── Hero timer card ──────────────────────────────────────── -->
                <Card class="lg:col-span-2 border-zinc-200 dark:border-zinc-800">
                  <CardContent class="p-8 flex flex-col items-center justify-center text-center min-h-[280px]">
                    <p class="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-4">Tiempo Neto Efectivo
                    </p>

                    <!-- Giant timer display -->
                    <div class="relative">
                      <p
                        class="text-7xl md:text-8xl font-black tabular-nums tracking-tighter leading-none text-zinc-900 dark:text-zinc-50">
                        {{ formatTime(effectiveWorkSeconds) }}
                      </p>
                      <!-- Subtle ring indicator -->
                      <div v-if="isWorking && !isPaused"
                        class="absolute -inset-4 rounded-full border-2 border-primary/20 animate-ping pointer-events-none opacity-30" />
                    </div>

                    <div class="flex items-center gap-2 mt-4">
                      <span :class="['w-2 h-2 rounded-full', statusColor, isWorking ? 'animate-pulse' : '']" />
                      <p class="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{{ statusLabel }}</p>
                    </div>

                    <!-- Break toggle button -->
                    <Button v-if="isWorking" @click="toggleBreak" variant="outline"
                      class="mt-8 h-10 px-6 text-[10px] font-black uppercase tracking-widest rounded-full">
                      <Coffee class="w-3.5 h-3.5 mr-2" />
                      {{ isPaused ? 'Retomar trabajo' : 'Tomar break' }}
                    </Button>

                    <!-- Idle state -->
                    <div v-if="!isWorking" class="mt-6 space-y-3">
                      <p class="text-xs text-zinc-400 font-medium">No hay turno activo</p>
                      <Button @click="startShiftPrompt(false)"
                        class="h-10 px-6 text-[10px] font-black uppercase tracking-widest rounded-full">
                        <Play class="w-3.5 h-3.5 mr-2" /> Iniciar jornada
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <!-- ── Quick Context / Handoff View (Replaced Diary) ──────── -->
                <Card class="border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
                  <CardHeader class="pb-2 px-5 pt-5">
                    <CardTitle
                      class="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                      <MessageSquare class="w-3 h-3" /> Info del Turno Anterior
                    </CardTitle>
                  </CardHeader>
                  <CardContent class="px-5 pb-5">
                    <div class="space-y-4">
                      <div v-if="assignedModels.length > 0" class="space-y-3">
                        <div v-for="m in assignedModels.slice(0, 2)" :key="m.id"
                          class="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                          <p class="text-[10px] font-black uppercase tracking-tight text-primary mb-1">{{ m.name }}</p>
                          <p v-if="handoffData[m.id]?.length > 0"
                            class="text-xs text-zinc-600 dark:text-zinc-400 italic line-clamp-3 leading-relaxed">
                            "{{ handoffData[m.id][0].message }}"
                          </p>
                          <p v-else class="text-[10px] text-zinc-400 italic">Sin notas recientes</p>
                        </div>
                      </div>
                      <Button variant="link" @click="activeTab = 'context'"
                        class="h-auto p-0 text-[10px] font-bold uppercase tracking-widest text-primary">
                        Ver todas las bitácoras →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <!-- Marketing panel (role-specific) -->
              <MarketingPanel v-if="isMarketing && isWorking" ref="marketingPanelRef" :shiftId="currentShiftId" />
            </div>

            <!-- ── CRM VIEW ──────────────────────────────────────────────────── -->
            <div v-if="activeTab === 'crm'">
              <LeadsKanban />
            </div>

            <!-- ── CREATIVE WALL VIEW ────────────────────────────────────────── -->
            <div v-if="activeTab === 'creative'">
              <CreativityWall />
            </div>

            <!-- ── HISTORY VIEW ───────────────────────────────────────────────── -->
            <div v-if="activeTab === 'history'">
              <UserShiftHistory />
            </div>

            <!-- ── CONTEXT / HANDOFF VIEW ─────────────────────────────────────── -->
            <div v-if="activeTab === 'context'" class="space-y-6">

              <!-- Header -->
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-lg font-black uppercase tracking-tight text-foreground">Contexto de Modelos</h2>
                  <p class="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mt-0.5">
                    Notas del último turno por cada modelo asignada
                  </p>
                </div>
                <Button variant="outline" size="sm" @click="loadHandoff"
                  class="h-9 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2">
                  <Clock class="w-3.5 h-3.5" /> Actualizar
                </Button>
              </div>

              <!-- Grid of handoff cards -->
              <div v-if="assignedModels.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <ModelHandoffCard v-for="m in assignedModels" :key="m.id" :model="m"
                  :entries="handoffData[m.id] || []" />
              </div>

              <!-- Empty — no assigned models -->
              <div v-else class="flex flex-col items-center justify-center py-24 text-center gap-4">
                <Users class="w-10 h-10 text-zinc-300 dark:text-zinc-600" />
                <div>
                  <p class="text-xs font-black uppercase tracking-widest text-zinc-400">Sin modelos asignadas</p>
                  <p class="text-[10px] text-zinc-400/60 mt-1">Las modelos se asignan desde el panel de administración.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </ScrollArea>
      </main>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════════
         MODAL: START SHIFT
         ══════════════════════════════════════════════════════════════════════ -->
    <Dialog v-model:open="showStartModal">
      <DialogContent class="sm:max-w-md rounded-2xl">
        <DialogHeader class="items-center text-center pb-2">
          <div
            :class="['w-12 h-12 rounded-2xl flex items-center justify-center mb-2', isExtraHoursSelection ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-primary/10 text-primary']">
            <Zap v-if="isExtraHoursSelection" class="w-5 h-5" />
            <Play v-else class="w-5 h-5" />
          </div>
          <DialogTitle class="text-lg font-black uppercase tracking-tight">
            {{ isExtraHoursSelection ? 'Horas Extras' : 'Nueva Jornada' }}
          </DialogTitle>
          <DialogDescription class="text-[10px] font-bold uppercase tracking-widest">
            Configurá tus métricas iniciales
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-2">
          <!-- Regular shift fields -->
          <!-- Regular shift fields (Hidden for Chatters, they only report net at end) -->
          <div v-if="false" class="space-y-3">
            <!-- Hidden by user request: chatters do not report at start -->
          </div>

          <!-- Marketing mode notice -->
          <div v-else-if="!isExtraHoursSelection && isMarketing"
            class="py-3 px-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900 text-center">
            <p class="text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Sesión de
              Captación & Marca</p>
            <p class="text-[10px] text-emerald-600/70 mt-0.5">El progreso se mide por leads y contenido.</p>
          </div>

          <!-- Extras mode: financial data -->
          <!-- Extras mode: financial data (Hidden for Chatters) -->
          <div v-if="false" class="space-y-3">
            <!-- Hidden by user request -->
          </div>
          <div v-if="isExtraHoursSelection && !isMarketing"
            class="py-2 px-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900 text-center">
            <p class="text-[9px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">Sin meta
              horaria
              fija</p>
            <p class="text-[10px] text-amber-600/70 mt-0.5">El cronómetro correrá sin límite de jornada.</p>
          </div>
          <!-- Extras marketing mode notice -->
          <div v-if="isExtraHoursSelection && isMarketing"
            class="py-3 px-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900 text-center">
            <p class="text-[9px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">Sin meta
              horaria
              fija</p>
            <p class="text-[10px] text-amber-600/70 mt-0.5">El cronómetro correrá sin límite de jornada.</p>
          </div>

          <!-- Action buttons -->
          <div class="flex flex-col gap-2 pt-2">
            <Button v-if="!isExtraHoursSelection" @click="startShift(false)"
              class="w-full h-11 text-[11px] font-black uppercase tracking-widest">
              Iniciar jornada regular
            </Button>
            <Button v-if="!isExtraHoursSelection" @click="isExtraHoursSelection = true" variant="ghost"
              class="w-full h-9 text-[9px] font-bold uppercase tracking-widest text-zinc-400 hover:text-amber-600">
              ¿Son horas extras?
            </Button>

            <Button v-if="isExtraHoursSelection" @click="startShift(true)"
              class="w-full h-11 text-[11px] font-black uppercase tracking-widest bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200 dark:shadow-amber-900 shadow-lg">
              Iniciar horas extras
            </Button>
            <Button v-if="isExtraHoursSelection" @click="isExtraHoursSelection = false" variant="ghost"
              class="w-full h-9 text-[9px] font-bold uppercase tracking-widest text-zinc-400">
              Volver a jornada regular
            </Button>

            <Button @click="showStartModal = false" variant="link"
              class="text-[9px] font-bold uppercase tracking-widest text-zinc-300 hover:text-zinc-500 mt-1">
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- ══════════════════════════════════════════════════════════════════════
         MODAL: END SHIFT / REPORT
         ══════════════════════════════════════════════════════════════════════ -->
    <Dialog v-model:open="showReportModal" :modal="true">
      <DialogContent class="sm:max-w-lg rounded-2xl" :close-button="false">
        <DialogHeader class="items-center text-center pb-1">
          <div
            :class="['w-12 h-12 rounded-full flex items-center justify-center mb-2', isForceExit ? 'bg-red-100 dark:bg-red-950/40 text-red-600' : 'bg-primary/10 text-primary']">
            <AlertTriangle v-if="isForceExit" class="w-5 h-5" />
            <CheckCircle2 v-else class="w-5 h-5" />
          </div>
          <DialogTitle :class="['text-lg font-black uppercase tracking-tight', isForceExit ? 'text-red-600' : '']">
            {{ isForceExit ? 'Abandono de jornada' : 'Cerrar turno' }}
          </DialogTitle>
          <DialogDescription class="text-[11px] font-medium text-center leading-relaxed">
            {{ isForceExit
              ? 'Debés justificar por qué cerrás antes de cumplir la meta horaria.'
              : 'Completá el reporte de turno para finalizar.'
            }}
          </DialogDescription>
        </DialogHeader>

        <div class="overflow-y-auto max-h-[70vh] space-y-4 py-1 pr-1">

          <!-- Force exit reason -->
          <div v-if="isForceExit"
            class="space-y-1.5 p-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900">
            <label class="text-[9px] font-black uppercase tracking-widest text-red-600 pl-0.5">
              Razón de abandono <span class="text-red-400">(obligatorio)</span>
            </label>
            <Textarea v-model="emergencyReason" placeholder="Ej: Problema de conexión, emergencia, etc."
              class="h-20 resize-none text-sm border-red-200 dark:border-red-900 bg-white dark:bg-zinc-900 focus-visible:ring-red-400/30" />
          </div>

          <!-- Standard metrics (chatters) -->
          <template v-if="!isMarketing">
            <div class="space-y-2">
              <label
                class="text-[10px] font-black uppercase tracking-widest text-primary pl-0.5 text-center block w-full">Facturación
                Neta Total ($)</label>
              <Input type="number" v-model="startEarnings" placeholder="0.00"
                class="h-16 font-black text-3xl bg-primary/5 border-primary/20 text-center" />
              <p class="text-[10px] text-muted-foreground text-center">Ingresá el monto total generado durante este
                turno.</p>
            </div>

            <div class="space-y-1.5 pt-2">
              <label class="text-[9px] font-black uppercase tracking-widest text-zinc-400 pl-0.5">Observaciones
                generales</label>
              <Textarea v-model="observations" placeholder="Novedades, logros, inconvenientes del turno..."
                class="h-16 resize-none text-sm" />
            </div>
          </template>

          <div v-else
            class="py-3 px-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-center">
            <p class="text-xs font-medium text-zinc-500">Las métricas de marketing se adjuntan automáticamente.</p>
          </div>

          <!-- ─── PER-MODEL SECTION ─────────────────────────────────────────── -->
          <template v-if="!isMarketing && perModelReports.length > 0">
            <div class="pt-2 space-y-3">
              <div class="flex items-center justify-between">
                <p class="text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <Users class="w-3 h-3" /> Informe por Modelo
                </p>
                <span class="text-[8px] font-bold text-zinc-300 uppercase tracking-widest">Opcional</span>
              </div>

              <!-- Model Selector Chips -->
              <div class="flex flex-wrap gap-1.5">
                <button v-for="(mr, idx) in perModelReports" :key="mr.modelId" @click="selectedModelReportIdx = idx"
                  type="button" :class="[
                    'px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border flex items-center gap-2',
                    selectedModelReportIdx === idx
                      ? 'bg-primary border-primary text-white shadow-sm'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-primary/50'
                  ]">
                  {{ mr.modelName }}
                  <div v-if="mr.handoffNotes || mr.spenders.some(s => s.name || s.username || s.amount)"
                    class="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                </button>
              </div>

              <!-- Active Model Report Form -->
              <div v-if="perModelReports[selectedModelReportIdx]"
                class="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <div class="flex items-center gap-2">
                  <div
                    class="w-8 h-8 rounded-lg bg-primary text-white text-[12px] font-black flex items-center justify-center">
                    {{ perModelReports[selectedModelReportIdx].modelName.charAt(0) }}
                  </div>
                  <div class="flex flex-col">
                    <span class="text-[11px] font-black uppercase tracking-wide leading-none">
                      {{ perModelReports[selectedModelReportIdx].modelName }}
                    </span>
                    <span class="text-[9px] text-primary/60 font-medium">Informe de ventas</span>
                  </div>
                </div>

                <!-- Content most sold / Handoff Notes -->
                <div class="space-y-1.5">
                  <label class="text-[8px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                    <Megaphone class="w-3 h-3 text-primary" /> Notas de Handoff / Negociaciones
                  </label>
                  <Textarea v-model="perModelReports[selectedModelReportIdx].handoffNotes"
                    placeholder="Escribe aquí las notas de handoff para el siguiente chatter."
                    class="h-24 resize-none text-sm bg-white dark:bg-zinc-900 border-zinc-200 focus-visible:ring-primary/30 font-medium italic" />
                  <p class="text-[8px] text-zinc-400 uppercase tracking-widest leading-none mt-1">
                    * Esta nota será lo primero que vea el siguiente chatter.
                  </p>
                </div>

                <!-- Spenders List -->
                <div class="space-y-2">
                  <label class="text-[8px] font-black uppercase tracking-widest text-zinc-400">Compradores
                    Principales</label>
                  <div class="space-y-1.5">
                    <div v-for="(sp, sIdx) in perModelReports[selectedModelReportIdx].spenders" :key="sIdx"
                      class="flex gap-1.5 items-center">
                      <Input v-model="sp.name" placeholder="Nombre" class="h-8 text-[11px] flex-1 border-zinc-200" />
                      <Input v-model="sp.username" placeholder="@usuario"
                        class="h-8 text-[11px] w-28 border-zinc-200" />
                      <Input v-model="sp.amount" placeholder="$" class="h-8 text-[11px] w-16 border-zinc-200" />
                      <button v-if="perModelReports[selectedModelReportIdx].spenders.length > 1" type="button"
                        @click="removeSpender(selectedModelReportIdx, sIdx)"
                        class="text-zinc-300 hover:text-red-500 transition-colors shrink-0">
                        <X class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <button type="button" @click="addSpender(selectedModelReportIdx)"
                    class="text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary-foreground hover:bg-primary px-2 py-1 rounded transition-all flex items-center gap-1.5 mt-1 border border-primary/20">
                    <Plus class="w-3 h-3" /> Agregar comprador
                  </button>
                </div>
              </div>
            </div>
          </template>

          <!-- CTA buttons -->
          <div class="flex flex-col gap-2 pt-1">
            <Button @click="submitEndShift(false)" :disabled="isForceExit && emergencyReason.length < 10"
              :class="['w-full h-11 text-[10px] font-black uppercase tracking-widest', isForceExit ? 'bg-red-600 hover:bg-red-700 text-white' : '']">
              {{ isForceExit ? 'Confirmar abandono y cerrar' : 'Finalizar turno' }}
            </Button>
            <Button v-if="!isExtraHours" @click="submitEndShift(true)" variant="outline"
              class="w-full h-11 text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5">
              Finalizar y empezar extras
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- ══════════════════════════════════════════════════════════════════════
         MODAL: GHOST MODE (SECRET)
         ══════════════════════════════════════════════════════════════════════ -->
    <Dialog v-model:open="showSecretModal">
      <DialogContent
        class="sm:max-w-md bg-zinc-950 text-white border-zinc-800 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,1)]">
        <DialogHeader class="items-start text-left">
          <div class="flex items-center gap-2 text-primary">
            <Zap class="w-4 h-4 fill-primary" />
            <DialogTitle class="text-sm font-black uppercase tracking-widest">Ghost Config</DialogTitle>
          </div>
          <DialogDescription class="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
            Mantené perfil bajo mientras trabajás
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-5 py-2">
          <!-- Main Toggle -->
          <div class="flex items-center justify-between p-3 bg-zinc-900 rounded-xl border border-zinc-800">
            <div class="space-y-0.5">
              <p class="text-xs font-black uppercase tracking-wide cursor-default">Status del Modo</p>
              <p class="text-[9px] text-zinc-500">Activá/Desactivá el ocultamiento</p>
            </div>
            <button @click="secretSettings.enabled = !secretSettings.enabled; saveGhostConfig()"
              :class="['w-12 h-6 rounded-full transition-all relative flex items-center px-1', secretSettings.enabled ? 'bg-primary' : 'bg-zinc-700']">
              <div
                :class="['w-4 h-4 bg-white rounded-full transition-all shadow-md', secretSettings.enabled ? 'translate-x-6' : 'translate-x-0']" />
            </button>
          </div>

          <div v-if="secretSettings.enabled" class="space-y-4 animate-in fade-in slide-in-from-top-2">
            <!-- Mock App Name -->
            <div class="space-y-1.5">
              <label class="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Alias de App
                Segura</label>
              <Input v-model="secretSettings.mockApp" @change="saveGhostConfig"
                class="h-10 bg-zinc-900 border-zinc-800 text-xs font-bold" />
            </div>

            <!-- Excluded Keywords -->
            <div class="space-y-1.5">
              <label class="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Keywords a
                Ocultar</label>
              <Textarea :value="secretSettings.excludedApps.join(', ')"
                @input="secretSettings.excludedApps = $event.target.value.split(',').map(s => s.trim()); saveGhostConfig()"
                placeholder="lol, steam, valorant..."
                class="h-16 bg-zinc-900 border-zinc-800 text-[11px] resize-none" />
            </div>

            <!-- Anti AFK -->
            <div class="flex items-center justify-between px-1">
              <div class="space-y-0.5">
                <p class="text-[11px] font-bold uppercase tracking-wide">Stealth Capture</p>
                <p class="text-[9px] text-zinc-500 italic">{{ secretSettings.blockCapture ? 'No envía ninguna captura' :
                  'Envía captura desenfocada' }}</p>
              </div>
              <button @click="secretSettings.blockCapture = !secretSettings.blockCapture; saveGhostConfig()"
                class="text-xs font-black uppercase text-primary border border-primary/20 px-2 py-1 rounded">
                {{ secretSettings.blockCapture ? 'BLOQUEAR' : 'DESENFOCAR' }}
              </button>
            </div>

            <div class="flex items-center justify-between px-1">
              <div class="space-y-0.5">
                <p class="text-[11px] font-bold uppercase tracking-wide">Anti-AFK Bypass</p>
              </div>
              <button @click="secretSettings.antiAfk = !secretSettings.antiAfk; saveGhostConfig()"
                class="text-primary hover:text-white transition-colors">
                <CheckCircle2 v-if="secretSettings.antiAfk" class="w-5 h-5" />
                <div v-else class="w-5 h-5 rounded-md border-2 border-zinc-700" />
              </button>
            </div>
          </div>

          <div class="pt-2 border-t border-zinc-800">
            <Button @click="showSecretModal = false"
              class="w-full text-[10px] font-black uppercase tracking-widest bg-zinc-100 text-black hover:bg-white">
              Cerrar Configuración
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

  </TooltipProvider>
</template>