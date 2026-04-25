<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Send, Phone, Video, Users, Calendar } from 'lucide-vue-next'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import CallRoom from './CallRoom.vue'

const auth = useAuthStore()
const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://service-production-1ef2.up.railway.app/api/v1'
const wsUrl = apiUrl.replace('/api/v1', '/ws/team')

const stompClient = ref(null)
const teamMessages = ref([])
const conversations = ref([])
const onlineUsers = ref([])
const selectedUser = ref(null)
const dmMessages = ref([])
const meetings = ref([])
const teamInput = ref('')
const dmInput = ref('')
const callOpen = ref(false)
const activeMeeting = ref(null)

const token = computed(() => auth.user?.token)
const headers = computed(() => ({ Authorization: `Bearer ${token.value}` }))

async function fetchTeamMessages() {
  const res = await fetch(`${apiUrl}/team/messages`, { headers: headers.value })
  if (res.ok) teamMessages.value = (await res.json()).reverse()
}

async function fetchConversations() {
  const res = await fetch(`${apiUrl}/team/dm/conversations`, { headers: headers.value })
  if (res.ok) conversations.value = await res.json()
}

async function fetchDMs(userId) {
  const res = await fetch(`${apiUrl}/team/dm/${userId}`, { headers: headers.value })
  if (res.ok) dmMessages.value = await res.json()
}

async function fetchMeetings() {
  const res = await fetch(`${apiUrl}/team/meetings`, { headers: headers.value })
  if (res.ok) meetings.value = await res.json()
}

function connectWS() {
  const socket = new SockJS(wsUrl)
  stompClient.value = new Client({
    webSocketFactory: () => socket,
    reconnectDelay: 5000,
    onConnect: () => {
      stompClient.value.subscribe('/topic/team', (msg) => {
        const data = JSON.parse(msg.body)
        teamMessages.value.push(data)
      })
      
      stompClient.value.subscribe(`/user/queue/dm`, (msg) => {
        const data = JSON.parse(msg.body)
        if (selectedUser.value?.id === data.sender.id) {
          dmMessages.value.push(data)
        }
        fetchConversations()
      })
    }
  })
  stompClient.value.activate()
}

function sendTeamMessage() {
  if (!teamInput.value.trim()) return
  stompClient.value.publish({
    destination: '/app/team/message',
    body: JSON.stringify({ content: teamInput.value })
  })
  teamInput.value = ''
}

async function sendDM() {
  if (!dmInput.value.trim() || !selectedUser.value) return
  const res = await fetch(`${apiUrl}/team/dm/${selectedUser.value.id}`, {
    method: 'POST',
    headers: { ...headers.value, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: dmInput.value })
  })
  if (res.ok) {
    const msg = await res.json()
    dmMessages.value.push(msg)
    dmInput.value = ''
  }
}

function selectConversation(conv) {
  selectedUser.value = conv.user
  fetchDMs(conv.user.id)
}

function joinMeeting(meeting) {
  activeMeeting.value = meeting
  callOpen.value = true
}

onMounted(() => {
  fetchTeamMessages()
  fetchConversations()
  fetchMeetings()
  connectWS()
})

onUnmounted(() => {
  stompClient.value?.deactivate()
})
</script>

<template>
  <div class="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950">
    <div class="p-4 border-b border-zinc-200 dark:border-zinc-800">
      <h2 class="text-lg font-black text-zinc-900 dark:text-zinc-100">Comunicación Interna</h2>
    </div>

    <Tabs default-value="team" class="flex-1 flex flex-col">
      <TabsList class="mx-4 mt-2">
        <TabsTrigger value="team" class="gap-2"><Users class="w-4 h-4" /> Chat Grupal</TabsTrigger>
        <TabsTrigger value="dm" class="gap-2"><Send class="w-4 h-4" /> Mensajes</TabsTrigger>
        <TabsTrigger value="meetings" class="gap-2"><Calendar class="w-4 h-4" /> Reuniones</TabsTrigger>
      </TabsList>

      <!-- Team Chat -->
      <TabsContent value="team" class="flex-1 flex flex-col m-0 p-4">
        <ScrollArea class="flex-1 mb-4">
          <div class="space-y-3">
            <div v-for="msg in teamMessages" :key="msg.id" 
              :class="['p-3 rounded-lg', msg.isAnnouncement ? 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20' : 'bg-white dark:bg-zinc-900']">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-bold text-zinc-900 dark:text-zinc-100">{{ msg.user.name }}</span>
                <span class="text-[10px] text-zinc-400">{{ new Date(msg.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) }}</span>
                <Badge v-if="msg.isAnnouncement" variant="secondary" class="text-[9px] h-4">Aviso</Badge>
              </div>
              <p class="text-sm text-zinc-700 dark:text-zinc-300">{{ msg.content }}</p>
            </div>
          </div>
        </ScrollArea>
        <div class="flex gap-2">
          <Input v-model="teamInput" placeholder="Mensaje al equipo..." @keyup.enter="sendTeamMessage" />
          <Button @click="sendTeamMessage" size="icon"><Send class="w-4 h-4" /></Button>
        </div>
      </TabsContent>

      <!-- Direct Messages -->
      <TabsContent value="dm" class="flex-1 flex m-0">
        <div class="w-64 border-r border-zinc-200 dark:border-zinc-800 p-2">
          <ScrollArea class="h-full">
            <div class="space-y-1">
              <button v-for="conv in conversations" :key="conv.user.id" @click="selectConversation(conv)"
                :class="['w-full p-2 rounded-lg text-left transition-colors', selectedUser?.id === conv.user.id ? 'bg-zinc-100 dark:bg-zinc-900' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/50']">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{{ conv.user.name }}</span>
                  <Badge v-if="conv.unreadCount > 0" variant="destructive" class="text-[9px] h-4">{{ conv.unreadCount }}</Badge>
                </div>
              </button>
            </div>
          </ScrollArea>
        </div>
        <div v-if="selectedUser" class="flex-1 flex flex-col p-4">
          <div class="mb-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
            <span class="text-sm font-bold text-zinc-900 dark:text-zinc-100">{{ selectedUser.name }}</span>
          </div>
          <ScrollArea class="flex-1 mb-4">
            <div class="space-y-2">
              <div v-for="msg in dmMessages" :key="msg.id" 
                :class="['p-2 rounded-lg max-w-[70%]', msg.sender.id === auth.user.id ? 'ml-auto bg-blue-500 text-white' : 'bg-white dark:bg-zinc-900']">
                <p class="text-sm">{{ msg.content }}</p>
                <span class="text-[10px] opacity-70">{{ new Date(msg.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) }}</span>
              </div>
            </div>
          </ScrollArea>
          <div class="flex gap-2">
            <Input v-model="dmInput" placeholder="Mensaje..." @keyup.enter="sendDM" />
            <Button @click="sendDM" size="icon"><Send class="w-4 h-4" /></Button>
          </div>
        </div>
        <div v-else class="flex-1 flex items-center justify-center text-zinc-400">
          Seleccioná una conversación
        </div>
      </TabsContent>

      <!-- Meetings -->
      <TabsContent value="meetings" class="flex-1 m-0 p-4">
        <ScrollArea class="h-full">
          <div class="space-y-3">
            <div v-for="meeting in meetings" :key="meeting.id" 
              class="p-4 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <div class="flex items-start justify-between mb-2">
                <div>
                  <h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-100">{{ meeting.title }}</h3>
                  <p class="text-xs text-zinc-500">{{ new Date(meeting.scheduledAt).toLocaleString('es-AR') }}</p>
                </div>
                <Badge v-if="meeting.isActive" variant="default">En vivo</Badge>
              </div>
              <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-3">{{ meeting.description }}</p>
              <Button v-if="meeting.isActive" size="sm" class="gap-2" @click="joinMeeting(meeting)">
                <Video class="w-4 h-4" /> Unirse
              </Button>
            </div>
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>

    <CallRoom v-model:open="callOpen" :meeting="activeMeeting" />
  </div>
</template>
