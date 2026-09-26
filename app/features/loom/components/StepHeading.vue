<script setup lang="ts">
/** Tezgâhtaki numaralı adım başlığı: (1) Motifini çiz. */
defineProps<{ step: number; title: string }>()
</script>

<template>
  <div class="step">
    <span class="step__no" aria-hidden="true">{{ step }}</span>
    <h2 class="step__title">{{ title }}</h2>
  </div>
</template>

<style scoped>
.step {
  display: flex;
  align-items: center;
  gap: 10px;
}

.step__no {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--ink);
  color: var(--surface);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 15px;
  flex-shrink: 0;
}

.step__title {
  font-size: 22px;
}
</style>
