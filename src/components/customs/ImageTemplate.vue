<script setup lang="ts">
const props = defineProps<{ modelValue: Record<string, string> }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: Record<string, string>): void }>()

const fields = [
  { key: 'ofUser', label: 'Usuario', placeholder: '@usuario' },
  { key: 'nick', label: 'Nick / Edad / Idioma', placeholder: 'Ej: Greg / 42YO INGLÉS' },
  { key: 'price', label: 'Precio', placeholder: 'Ej: 100' },
  { key: 'time', label: 'Time', placeholder: 'Ej: 5' },
  { key: 'language', label: 'Lenguaje', placeholder: 'Ej: INGLÉS' },
  { key: 'quantity', label: 'Cantidad de imágenes', placeholder: 'Ej: 5' },
  { key: 'notes', label: 'Notas / Descripción', placeholder: 'Descripción detallada del contenido...' },
]

function update(key: string, value: string) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>

<template>
  <div class="space-y-3">
    <div v-for="field in fields" :key="field.key">
      <label class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{{ field.label }}</label>
      <textarea v-if="field.key === 'notes'"
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
