<script setup lang="ts">
import {
  Radio, History, Users, Lightbulb, ClipboardCheck,
  LogOut, X, ChevronRight
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

type TabType = 'tracker' | 'history' | 'crm' | 'creative' | 'context'

const props = defineProps<{
  activeTab: TabType
  isMarketing: boolean
  open?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:activeTab', value: TabType): void
  (e: 'update:searchQuery', value: string): void
  (e: 'update:open', value: boolean): void
  (e: 'logout'): void
}>()

const auth = useAuthStore()

const sections = [
  {
    label: 'Tiempo Real',
    items: [
      { id: 'tracker' as TabType, label: 'Control de Turno', icon: Radio, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-500/10 dark:bg-emerald-500/15', badge: 'live', show: true },
      { id: 'history' as TabType, label: 'Mi Rendimiento', icon: History, color: 'text-sky-500 dark:text-sky-400', bg: 'bg-sky-500/10 dark:bg-sky-500/15', badge: null, show: true },
    ]
  },
  {
    label: 'Estrategia Agency',
    items: [
      { id: 'crm' as TabType, label: 'Gestión de Leads', icon: Users, color: 'text-violet-500 dark:text-violet-400', bg: 'bg-violet-500/10 dark:bg-violet-500/15', badge: null, show: props.isMarketing },
      { id: 'creative' as TabType, label: 'Muro Creativo', icon: Lightbulb, color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-500/10 dark:bg-amber-500/15', badge: null, show: props.isMarketing },
      { id: 'context' as TabType, label: 'Historial de Relevo', icon: ClipboardCheck, color: 'text-rose-500 dark:text-rose-400', bg: 'bg-rose-500/10 dark:bg-rose-500/15', badge: null, show: true },
    ]
  }
]

function selectTab(id: TabType) {
  emit('update:activeTab', id)
  emit('update:open', false)
}
</script>

<template>
  <!-- Mobile overlay -->
  <Transition name="fade">
    <div v-if="open" class="fixed inset-0 z-40 bg-black/40 lg:hidden backdrop-blur-sm"
      @click="emit('update:open', false)" />
  </Transition>

  <!-- Sidebar -->
  <Transition name="slide">
    <aside class="
        fixed lg:sticky top-0 left-0 z-50 lg:z-30
        w-64 h-screen flex flex-col overflow-hidden
        bg-white dark:bg-zinc-950
        border-r border-zinc-200 dark:border-zinc-800
        transition-transform duration-300 ease-in-out
      " :class="[
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      ]">

      <!-- Brand -->
      <div class="px-5 pt-5 pb-4 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-lg bg-zinc-900 dark:bg-white flex items-center justify-center shrink-0">
            <span class="text-white dark:text-zinc-900 text-[10px] font-black tracking-tight">E</span>
          </div>
          <div>
            <p class="text-sm font-black text-zinc-900 dark:text-zinc-50 leading-none tracking-tight uppercase">EssenzaModels</p>
            <p class="text-[9px] text-zinc-400 dark:text-zinc-500 leading-none mt-1 font-bold uppercase tracking-widest">Official Platform</p>
          </div>
        </div>
        <!-- Close button — mobile only -->
        <button
          class="lg:hidden flex items-center justify-center w-7 h-7 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          @click="emit('update:open', false)">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="mx-5 h-px bg-zinc-100 dark:bg-zinc-800" />

      <!-- Nav -->
      <nav class="flex-1 px-3 overflow-y-auto space-y-4 pb-2 pt-3"
        style="scrollbar-width: thin; scrollbar-color: #e4e4e7 transparent;">
        <template v-for="section in sections" :key="section.label">
          <div>
            <p class="text-[10px] font-semibold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest px-2 mb-1.5">
              {{ section.label }}
            </p>
            <ul class="space-y-0.5">
              <li v-for="item in section.items" :key="item.id">
                <button v-if="item.show !== false" @click="selectTab(item.id)"
                  class="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-all duration-150 group"
                  :class="[
                    activeTab === item.id
                      ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50'
                      : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 hover:text-zinc-800 dark:hover:text-zinc-200'
                  ]">
                  <span class="w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-all"
                    :class="activeTab === item.id ? item.bg : 'bg-transparent'">
                    <component :is="item.icon" class="w-3.5 h-3.5 transition-colors"
                      :class="activeTab === item.id ? item.color : 'text-zinc-400 dark:text-zinc-500 group-hover:' + item.color" />
                  </span>

                  <span class="text-sm font-medium flex-1 leading-none">{{ item.label }}</span>

                  <!-- Live badge -->
                  <span v-if="item.badge === 'live' && activeTab === item.id"
                    class="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE
                  </span>

                  <!-- Live dot when not active -->
                  <span v-if="item.badge === 'live' && activeTab !== item.id"
                    class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />

                  <!-- Chevron when active -->
                  <ChevronRight v-if="activeTab === item.id && item.badge !== 'live'"
                    class="w-3 h-3 text-zinc-400 dark:text-zinc-600 shrink-0" />
                </button>
              </li>
            </ul>
          </div>
        </template>
      </nav>

      <div class="mx-5 h-px bg-zinc-100 dark:bg-zinc-800" />

      <!-- User + Logout -->
      <div class="p-3 space-y-1">
        <div class="flex items-center gap-3 px-2.5 py-2 rounded-lg">
          <span
            class="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
            <img v-if="auth.user?.profilePictureBase64" :src="auth.user?.profilePictureBase64"
              class="w-full h-full object-cover" />
            <span v-else class="text-[10px] font-black text-zinc-900 dark:text-zinc-50">{{ auth.user?.name?.charAt(0)
              }}</span>
          </span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate leading-none">{{ auth.user?.name }}
            </p>
            <p class="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium mt-0.5 leading-none">{{
              auth.user?.role?.replace('ROLE_', '') }}</p>
          </div>
        </div>
        <button @click="emit('logout')" class="
            w-full flex items-center gap-3 px-2.5 py-2 rounded-lg
            text-zinc-400 dark:text-zinc-500
            hover:text-red-600 dark:hover:text-red-400
            hover:bg-red-50 dark:hover:bg-red-500/10
            transition-all duration-150 text-left group
          ">
          <span
            class="w-7 h-7 rounded-md flex items-center justify-center bg-transparent group-hover:bg-red-100 dark:group-hover:bg-red-500/15 transition-all">
            <LogOut class="w-3.5 h-3.5" />
          </span>
          <span class="text-sm font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}
</style>