<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users } from 'lucide-vue-next'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

const props = defineProps({
  meeting: Object,
  open: Boolean
})

const emit = defineEmits(['update:open'])

const auth = useAuthStore()
const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://service-production-1ef2.up.railway.app/api/v1'
const wsUrl = apiUrl.replace('/api/v1', '/ws/team')

const stompClient = ref(null)
const localStream = ref(null)
const peerConnections = ref({})
const remoteStreams = ref({})
const audioEnabled = ref(true)
const videoEnabled = ref(true)
const localVideo = ref(null)
const participants = ref([])

const myEmail = computed(() => auth.user?.username)

async function startCall() {
  try {
    localStream.value = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
    if (localVideo.value) localVideo.value.srcObject = localStream.value
    
    connectWS()
  } catch (err) {
    console.error('Error accessing media:', err)
  }
}

function connectWS() {
  const socket = new SockJS(wsUrl)
  stompClient.value = new Client({
    webSocketFactory: () => socket,
    reconnectDelay: 5000,
    onConnect: () => {
      stompClient.value.subscribe(`/topic/meeting/${props.meeting.meetingLink}`, (msg) => {
        const data = JSON.parse(msg.body)
        handleSignal(data)
      })
      
      // Announce join
      sendSignal({ type: 'join', from: myEmail.value })
    }
  })
  stompClient.value.activate()
}

function sendSignal(payload) {
  if (!stompClient.value?.connected) return
  stompClient.value.publish({
    destination: `/app/meeting/${props.meeting.meetingLink}/signal`,
    body: JSON.stringify(payload)
  })
}

async function handleSignal(data) {
  const { type, from, signal } = data
  if (from === myEmail.value) return

  switch (type) {
    case 'join':
      if (!participants.value.includes(from)) {
        participants.value.push(from)
        createPeerConnection(from, true)
      }
      break
    case 'offer':
      await handleOffer(from, signal)
      break
    case 'answer':
      await peerConnections.value[from]?.setRemoteDescription(signal)
      break
    case 'ice':
      await peerConnections.value[from]?.addIceCandidate(signal)
      break
    case 'leave':
      closePeer(from)
      participants.value = participants.value.filter(p => p !== from)
      break
  }
}

function createPeerConnection(userId, isInitiator) {
  const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
  peerConnections.value[userId] = pc

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      sendSignal({ type: 'ice', from: myEmail.value, to: userId, signal: e.candidate })
    }
  }

  pc.ontrack = (e) => {
    remoteStreams.value[userId] = e.streams[0]
  }

  if (localStream.value) {
    localStream.value.getTracks().forEach(t => pc.addTrack(t, localStream.value))
  }

  if (isInitiator) {
    pc.createOffer().then(offer => {
      pc.setLocalDescription(offer)
      sendSignal({ type: 'offer', from: myEmail.value, to: userId, signal: offer })
    })
  }

  return pc
}

async function handleOffer(from, offer) {
  const pc = createPeerConnection(from, false)
  await pc.setRemoteDescription(offer)
  const answer = await pc.createAnswer()
  await pc.setLocalDescription(answer)
  sendSignal({ type: 'answer', from: myEmail.value, to: from, signal: answer })
}

function closePeer(userId) {
  peerConnections.value[userId]?.close()
  delete peerConnections.value[userId]
  delete remoteStreams.value[userId]
}

function toggleAudio() {
  audioEnabled.value = !audioEnabled.value
  localStream.value?.getAudioTracks().forEach(t => t.enabled = audioEnabled.value)
}

function toggleVideo() {
  videoEnabled.value = !videoEnabled.value
  localStream.value?.getVideoTracks().forEach(t => t.enabled = videoEnabled.value)
}

function endCall() {
  sendSignal({ type: 'leave', from: myEmail.value })
  localStream.value?.getTracks().forEach(t => t.stop())
  Object.keys(peerConnections.value).forEach(closePeer)
  stompClient.value?.deactivate()
  emit('update:open', false)
}

onMounted(() => {
  if (props.open) startCall()
})

onUnmounted(() => {
  endCall()
})
</script>

<template>
  <Dialog :open="open" @update:open="(val) => !val && endCall()">
    <DialogContent class="max-w-4xl h-[80vh]">
      <DialogHeader>
        <DialogTitle>{{ meeting?.title }}</DialogTitle>
      </DialogHeader>
      
      <div class="flex-1 grid grid-cols-2 gap-4 overflow-auto">
        <!-- Local video -->
        <div class="relative bg-zinc-900 rounded-lg overflow-hidden aspect-video">
          <video ref="localVideo" autoplay muted class="w-full h-full object-cover" />
          <Badge class="absolute bottom-2 left-2">Tú</Badge>
        </div>

        <!-- Remote videos -->
        <div v-for="(stream, userId) in remoteStreams" :key="userId" 
          class="relative bg-zinc-900 rounded-lg overflow-hidden aspect-video">
          <video :ref="el => { if (el) el.srcObject = stream }" autoplay class="w-full h-full object-cover" />
          <Badge class="absolute bottom-2 left-2">{{ userId.split('@')[0] }}</Badge>
        </div>
      </div>

      <!-- Controls -->
      <div class="flex items-center justify-center gap-3 pt-4 border-t">
        <Button @click="toggleAudio" :variant="audioEnabled ? 'default' : 'destructive'" size="icon" class="rounded-full w-12 h-12">
          <component :is="audioEnabled ? Mic : MicOff" class="w-5 h-5" />
        </Button>
        <Button @click="toggleVideo" :variant="videoEnabled ? 'default' : 'destructive'" size="icon" class="rounded-full w-12 h-12">
          <component :is="videoEnabled ? Video : VideoOff" class="w-5 h-5" />
        </Button>
        <Button @click="endCall" variant="destructive" size="icon" class="rounded-full w-12 h-12">
          <PhoneOff class="w-5 h-5" />
        </Button>
        <div class="ml-4 flex items-center gap-2 text-sm text-zinc-500">
          <Users class="w-4 h-4" />
          {{ participants.length + 1 }} participantes
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
