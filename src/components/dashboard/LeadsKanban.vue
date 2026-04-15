<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { MoreVertical, UserPlus, Instagram, Calendar, Filter, MessageCircle, CheckCircle, XCircle } from 'lucide-vue-next'
import api from '@/api'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { toast } from 'vue-sonner'

const leads = ref<any[]>([])
const loading = ref(true)

const fetchLeads = async () => {
    loading.value = true
    try {
        const res = await api.get('/model-leads')
        leads.value = res.data
    } catch {
        toast.error('Error al cargar CRM de Leads')
    } finally {
        loading.value = false
    }
}

const columns = [
    { id: 'NUEVO CONTÁCTO', name: 'Prospectos', color: 'bg-blue-500', icon: UserPlus },
    { id: 'CONTACTADO', name: 'En Conversación', color: 'bg-amber-500', icon: MessageCircle },
    { id: 'CERRADO (MODELO ACTIVA)', name: 'Cerradas ✨', color: 'bg-emerald-500', icon: CheckCircle },
    { id: 'RECHAZADO', name: 'No Interesadas', color: 'bg-zinc-500', icon: XCircle }
]

const getLeadsByStatus = (status: string) => {
    return leads.value.filter(l => l.status === status)
}

const updateStatus = async (id: number, newStatus: string) => {
    try {
        await api.put(`/model-leads/${id}/status`, { status: newStatus })
        fetchLeads()
        toast.success(`Estado actualizado a ${newStatus}`)
    } catch {
        toast.error('Error al actualizar estado')
    }
}

onMounted(fetchLeads)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
       <div>
          <h3 class="text-xl font-black uppercase tracking-tight">CRM de Captación</h3>
          <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Gestión Visual de Modelos</p>
       </div>
       <div class="flex gap-2">
          <Badge variant="outline" class="h-8 rounded-lg px-3 uppercase font-black text-[9px] border-emerald-500/20 text-emerald-600 bg-emerald-500/5">{{ leads.length }} Leads Totales</Badge>
       </div>
    </div>

    <!-- KANBAN BOARD -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 h-[70vh] overflow-x-auto pb-4">
       <div v-for="col in columns" :key="col.id" class="flex flex-col gap-4 min-w-[280px]">
          <!-- Column Header -->
          <div class="flex items-center justify-between px-2">
             <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full" :class="col.color"></div>
                <h4 class="text-[10px] font-black uppercase tracking-widest opacity-60">{{ col.name }}</h4>
             </div>
             <Badge variant="secondary" class="rounded-lg font-black text-[8px] opacity-40">{{ getLeadsByStatus(col.id).length }}</Badge>
          </div>

          <!-- Column Cards -->
          <div class="flex-1 space-y-3 bg-muted/20 p-4 rounded-[2.5rem] overflow-y-auto custom-scrollbar border border-border/40">
             <Card v-for="lead in getLeadsByStatus(col.id)" :key="lead.id" 
               class="group p-5 rounded-[1.8rem] border-none shadow-xl shadow-brand-dark/5 bg-card hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden">
                
                <div class="flex flex-col gap-3 relative z-10">
                   <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                         <Instagram class="w-3 h-3 text-pink-500" />
                         <span class="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{{ lead.source }}</span>
                      </div>
                      <button @click.stop class="opacity-0 group-hover:opacity-40 transition-opacity">
                         <MoreVertical class="w-4 h-4" />
                      </button>
                   </div>

                   <div>
                      <h5 class="text-xs font-black uppercase leading-none mb-1">{{ lead.name }}</h5>
                      <p class="text-[10px] font-bold text-primary truncate">{{ lead.instagram }}</p>
                   </div>

                   <div class="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                      <span class="text-[8px] font-black uppercase opacity-40">{{ lead.followers || '0' }} seg.</span>
                      <!-- Status Quick Change -->
                      <select @change="(e: any) => updateStatus(lead.id, e.target.value)" 
                         class="bg-muted px-1.5 h-5 rounded-md text-[7px] font-black uppercase outline-none cursor-pointer border-none appearance-none">
                         <option value="" disabled selected>Cambiar</option>
                         <option v-for="c in columns" :key="c.id" :value="c.id">{{ c.name }}</option>
                      </select>
                   </div>
                </div>
             </Card>

             <div v-if="getLeadsByStatus(col.id).length === 0" class="h-32 flex flex-col items-center justify-center border-2 border-dashed border-border/40 rounded-[2rem] opacity-20">
                <component :is="col.icon" class="w-6 h-6 mb-2" />
                <span class="text-[8px] font-black uppercase">Vacío</span>
             </div>
          </div>
       </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
</style>
