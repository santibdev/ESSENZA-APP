<script setup>
import { ref, onMounted } from 'vue'

const progress = ref(0)

onMounted(() => {
  // Simulate loading progress
  const steps = [
    { target: 35, delay: 200 },
    { target: 65, delay: 600 },
    { target: 85, delay: 1100 },
    { target: 100, delay: 1900 },
  ]

  steps.forEach(({ target, delay }) => {
    setTimeout(() => {
      progress.value = target
    }, delay)
  })
})
</script>

<template>
  <div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background overflow-hidden">

    <!-- Ambient glow blobs -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden">
      <div
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
               w-[500px] h-[500px] rounded-full
               bg-primary/10 blur-[100px]"
      />
      <div
        class="absolute top-1/4 right-1/4
               w-48 h-48 rounded-full
               bg-primary/5 blur-[60px]"
      />
    </div>

    <!-- Main content -->
    <div class="relative flex flex-col items-center gap-10 animate-fade-up">

      <!-- Logo mark -->
      <div class="splash-logo relative">
        <div
          class="w-20 h-20 rounded-2xl bg-primary
                 flex items-center justify-center
                 shadow-2xl shadow-primary/30"
        >
          <span class="text-4xl font-bold text-white tracking-tighter select-none">C</span>
        </div>
        <!-- Glow ring -->
        <div
          class="absolute inset-0 rounded-2xl bg-primary/30 blur-xl scale-110 -z-10"
        />
      </div>

      <!-- App name -->
      <div class="text-center space-y-1.5">
        <h1 class="text-xl font-bold tracking-[0.3em] uppercase text-foreground">
          Chatters
        </h1>
        <p class="text-xs text-muted-foreground tracking-[0.15em] uppercase">
          Corporate Communication Platform
        </p>
      </div>

      <!-- Progress bar -->
      <div class="w-44 space-y-2">
        <div class="h-[2px] w-full bg-border rounded-full overflow-hidden">
          <div
            class="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            :style="{ width: `${progress}%` }"
          />
        </div>
        <p class="text-center text-[10px] text-muted-foreground tracking-widest">
          INICIANDO...
        </p>
      </div>

    </div>
  </div>
</template>

<style scoped>
.splash-logo {
  animation: logoPop 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes logoPop {
  0%   { opacity: 0; transform: scale(0.6) translateY(16px); }
  70%  { opacity: 1; transform: scale(1.05) translateY(-4px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
</style>
