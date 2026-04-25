<script setup lang="ts">
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
    <div v-for="field in fields" :key="field.key">
      <label class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{{ field.label }}</label>
      <textarea v-if="['chatContext', 'expectations', 'notes'].includes(field.key)"
        :value="modelValue[field.key] || ''"
        @input="update(field.key, ($event.target as HTMLTextAreaElement).value)"
        :placeholder="field.placeholder"
        rows="3"
        class="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
      <input v-else
        :value="modelValue[field.key] || ''"
        @input="update(field.key, ($event.target as HTMLInputElement).value)"
        :placeholder="field.placeholder"
        class="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/30" />
    </div>
  </div>
</template>
