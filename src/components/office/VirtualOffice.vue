<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Mic, MicOff } from 'lucide-vue-next'
import SockJS from 'sockjs-client/dist/sockjs.min.js'
import { Client } from '@stomp/stompjs'

const auth = useAuthStore()
const canvas = ref(null)
const chatInput = ref('')
const messages = ref([])
const audioEnabled = ref(false)

// State
const users = ref({}) // { userId: { x, y, name, role } }
const myPos = ref({ x: 400, y: 300 })
const keys = ref({})
const stompClient = ref(null)
const peerConnections = ref({}) // { userId: RTCPeerConnection }
const localStream = ref(null)

const PROXIMITY_THRESHOLD = 150
const MOVE_SPEED = 3
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600

const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://service-production-1ef2.up.railway.app/api/v1'
const wsUrl = apiUrl.replace('/api/v1', '/ws/office')

const myId = computed(() => auth.user?.id?.toString())
const myName = computed(() => auth.user?.name || 'Usuario')
const myRole = computed(() => auth.user?.role?.replace('ROLE_', '') || 'USER')

// WebSocket connection
function connect() {
  const socket = new SockJS(wsUrl)
  stompClient.value = new Client({
    webSocketFactory: () => socket,
    reconnectDelay: 5000,
    onConnect: () => {
      console.log('✅ Connected to office')
      
      // Subscribe to broadcast
      stompClient.value.subscribe('/topic/office', (msg) => {
        const data = JSON.parse(msg.body)
        handleMessage(data)
      })

      // Subscribe to private WebRTC signals
      stompClient.value.subscribe(`/topic/office/signal/${myId.value}`, (msg) => {
        const data = JSON.parse(msg.body)
        handleSignal(data)
      })

      // Announce join
      send({ type: 'JOIN', x: myPos.value.x, y: myPos.value.y })
    },
    onDisconnect: () => console.log('❌ Disconnected from office')
  })
  stompClient.value.activate()
}

function send(payload) {
  if (!stompClient.value?.connected) return
  const msg = {
    ...payload,
    userId: myId.value,
    userName: myName.value,
    userRole: myRole.value
  }
  const dest = payload.targetId ? '/app/office/signal' : '/app/office'
  stompClient.value.publish({ destination: dest, body: JSON.stringify(msg) })
}

function handleMessage(data) {
  if (data.userId === myId.value) return

  switch (data.type) {
    case 'JOIN':
      users.value[data.userId] = { x: data.x, y: data.y, name: data.userName, role: data.userRole }
      messages.value.push({ text: `${data.userName} entró a la oficina`, system: true })
      break
    case 'LEAVE':
      delete users.value[data.userId]
      closePeer(data.userId)
      messages.value.push({ text: `${data.userName} salió de la oficina`, system: true })
      break
    case 'MOVE':
      if (users.value[data.userId]) {
        users.value[data.userId].x = data.x
        users.value[data.userId].y = data.y
        checkProximity(data.userId)
      }
      break
    case 'CHAT':
      messages.value.push({ text: `${data.userName}: ${data.text}`, system: false })
      break
  }
}

// WebRTC
async function handleSignal(data) {
  const { userId, signal } = data
  const sig = JSON.parse(signal)

  if (sig.type === 'offer') {
    const pc = createPeerConnection(userId)
    await pc.setRemoteDescription(sig)
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    send({ type: 'WEBRTC_SIGNAL', targetId: userId, signal: JSON.stringify(answer) })
  } else if (sig.type === 'answer') {
    await peerConnections.value[userId]?.setRemoteDescription(sig)
  } else if (sig.candidate) {
    await peerConnections.value[userId]?.addIceCandidate(sig)
  }
}

function createPeerConnection(userId) {
  const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
  peerConnections.value[userId] = pc

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      send({ type: 'WEBRTC_SIGNAL', targetId: userId, signal: JSON.stringify(e.candidate) })
    }
  }

  pc.ontrack = (e) => {
    const audio = new Audio()
    audio.srcObject = e.streams[0]
    audio.play()
  }

  if (localStream.value) {
    localStream.value.getTracks().forEach(t => pc.addTrack(t, localStream.value))
  }

  return pc
}

async function startAudioCall(userId) {
  if (!localStream.value) {
    localStream.value = await navigator.mediaDevices.getUserMedia({ audio: true })
  }
  const pc = createPeerConnection(userId)
  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)
  send({ type: 'WEBRTC_SIGNAL', targetId: userId, signal: JSON.stringify(offer) })
}

function closePeer(userId) {
  peerConnections.value[userId]?.close()
  delete peerConnections.value[userId]
}

function checkProximity(userId) {
  const user = users.value[userId]
  if (!user) return
  const dist = Math.hypot(user.x - myPos.value.x, user.y - myPos.value.y)
  const isClose = dist < PROXIMITY_THRESHOLD

  if (isClose && audioEnabled.value && !peerConnections.value[userId]) {
    startAudioCall(userId)
  } else if (!isClose && peerConnections.value[userId]) {
    closePeer(userId)
  }
}

async function toggleAudio() {
  audioEnabled.value = !audioEnabled.value
  if (audioEnabled.value) {
    localStream.value = await navigator.mediaDevices.getUserMedia({ audio: true })
    // Connect to nearby users
    Object.keys(users.value).forEach(checkProximity)
  } else {
    localStream.value?.getTracks().forEach(t => t.stop())
    localStream.value = null
    Object.keys(peerConnections.value).forEach(closePeer)
  }
}

// Movement
function gameLoop() {
  let moved = false
  if (keys.value['w'] || keys.value['ArrowUp']) { myPos.value.y = Math.max(20, myPos.value.y - MOVE_SPEED); moved = true }
  if (keys.value['s'] || keys.value['ArrowDown']) { myPos.value.y = Math.min(CANVAS_HEIGHT - 20, myPos.value.y + MOVE_SPEED); moved = true }
  if (keys.value['a'] || keys.value['ArrowLeft']) { myPos.value.x = Math.max(20, myPos.value.x - MOVE_SPEED); moved = true }
  if (keys.value['d'] || keys.value['ArrowRight']) { myPos.value.x = Math.min(CANVAS_WIDTH - 20, myPos.value.x + MOVE_SPEED); moved = true }

  if (moved) {
    send({ type: 'MOVE', x: myPos.value.x, y: myPos.value.y })
    Object.keys(users.value).forEach(checkProximity)
  }

  draw()
  requestAnimationFrame(gameLoop)
}

function draw() {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx) return

  // Background
  ctx.fillStyle = '#f4f4f5'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  // Grid
  ctx.strokeStyle = '#e4e4e7'
  ctx.lineWidth = 1
  for (let i = 0; i < CANVAS_WIDTH; i += 40) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_HEIGHT); ctx.stroke()
  }
  for (let i = 0; i < CANVAS_HEIGHT; i += 40) {
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_WIDTH, i); ctx.stroke()
  }

  // Other users
  Object.entries(users.value).forEach(([id, u]) => {
    const dist = Math.hypot(u.x - myPos.value.x, u.y - myPos.value.y)
    const isClose = dist < PROXIMITY_THRESHOLD

    ctx.fillStyle = isClose ? '#10b981' : '#6366f1'
    ctx.beginPath()
    ctx.arc(u.x, u.y, 15, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#000'
    ctx.font = 'bold 10px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(u.name, u.x, u.y - 20)
    ctx.font = '8px sans-serif'
    ctx.fillStyle = '#666'
    ctx.fillText(u.role, u.x, u.y - 10)
  })

  // Me
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.arc(myPos.value.x, myPos.value.y, 15, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#000'
  ctx.font = 'bold 10px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(myName.value + ' (Tú)', myPos.value.x, myPos.value.y - 20)
}

function sendChat() {
  if (!chatInput.value.trim()) return
  send({ type: 'CHAT', text: chatInput.value })
  messages.value.push({ text: `Tú: ${chatInput.value}`, system: false })
  chatInput.value = ''
}

onMounted(() => {
  connect()
  window.addEventListener('keydown', (e) => keys.value[e.key] = true)
  window.addEventListener('keyup', (e) => keys.value[e.key] = false)
  gameLoop()
})

onUnmounted(() => {
  send({ type: 'LEAVE' })
  stompClient.value?.deactivate()
  localStream.value?.getTracks().forEach(t => t.stop())
  Object.keys(peerConnections.value).forEach(closePeer)
})
</script>

<template>
  <div class="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950">
    <div class="p-4 border-b border-zinc-200 dark:border-zinc-800">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-black text-zinc-900 dark:text-zinc-100">Oficina Virtual</h2>
          <p class="text-xs text-zinc-500">Usa WASD o flechas para moverte</p>
        </div>
        <Button @click="toggleAudio" :variant="audioEnabled ? 'default' : 'outline'" size="sm" class="gap-2">
          <component :is="audioEnabled ? Mic : MicOff" class="w-4 h-4" />
          {{ audioEnabled ? 'Audio ON' : 'Audio OFF' }}
        </Button>
      </div>
    </div>

    <div class="flex-1 flex overflow-hidden">
      <!-- Canvas -->
      <div class="flex-1 flex items-center justify-center p-4">
        <canvas ref="canvas" :width="CANVAS_WIDTH" :height="CANVAS_HEIGHT" 
          class="border-2 border-zinc-300 dark:border-zinc-700 rounded-lg shadow-lg" />
      </div>

      <!-- Chat -->
      <div class="w-80 border-l border-zinc-200 dark:border-zinc-800 flex flex-col">
        <div class="p-3 border-b border-zinc-200 dark:border-zinc-800">
          <h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-100">Chat de Proximidad</h3>
        </div>
        <ScrollArea class="flex-1 p-3">
          <div class="space-y-2">
            <div v-for="(msg, i) in messages" :key="i" 
              :class="['text-xs p-2 rounded', msg.system ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 italic' : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100']">
              {{ msg.text }}
            </div>
          </div>
        </ScrollArea>
        <div class="p-3 border-t border-zinc-200 dark:border-zinc-800 flex gap-2">
          <Input v-model="chatInput" placeholder="Mensaje..." @keyup.enter="sendChat" class="flex-1" />
          <Button @click="sendChat" size="icon"><Send class="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  </div>
</template>
