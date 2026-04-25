<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

const props = defineProps<{ modelValue: Record<string, string> }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: Record<string, string>): void }>()

const fields = [
  { key: 'ofUser', label: 'Usuario OnlyFans', placeholder: '@usuario_only' },
  { key: 'fanName', label: 'Nombre del fan', placeholder: 'Nombre' },
  { key: 'telegram', label: 'Usuario Telegram', placeholder: '@usuario_telegram' },
  { key: 'age', label: 'Edad', placeholder: 'Edad' },
  { key: 'location', label: 'Ubicación', placeholder: 'País / Ciudad' },
  { key: 'duration', label: 'Duración', placeholder: 'Ej: 15 minutos' },
  { key: 'payment', label: 'Pago realizado', placeholder: 'Ej: $50 USD' },
  { key: 'chatContext', label: 'Contexto del chat', placeholder: 'Resumen de la conversación previa...' },
  { key: 'expectations', label: 'Lo que espera en la videollamada', placeholder: 'Descripción de la dinámica esperada...' },
  { key: 'notes', label: 'Notas importantes', placeholder: 'Límites, cosas que NO le gustan, potencial de upsell...' },
]

function update(key: string, value: string) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>

<template>
  <div class="space-y-3">
    <div v-for="field in fields" :key="field.key" class="space-y-1.5">
      <Label class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{{ field.label }}</Label>
      <Textarea v-if="['chatContext', 'expectations', 'notes'].includes(field.key)"
        :model-value="modelValue[field.key] || ''"
        @update:model-value="update(field.key, $event as string)"
        :placeholder="field.placeholder"
        rows="3"
        class="resize-none" />
      <Input v-else
        :model-value="modelValue[field.key] || ''"
        @update:model-value="update(field.key, $event as string)"
        :placeholder="field.placeholder" />
    </div>
  </div>
</template>
