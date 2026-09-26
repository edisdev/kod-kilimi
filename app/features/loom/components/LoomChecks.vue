<script setup lang="ts">
import type { ChecklistItem } from '../services/LoomChecklist'

/** Üç koşulun tamamlanma listesi. */
defineProps<{ items: readonly ChecklistItem[] }>()
</script>

<template>
  <ul class="checks">
    <li
      v-for="item in items"
      :key="item.key"
      class="checks__item"
      :class="{ 'checks__item--done': item.done }"
    >
      <span class="checks__dot" :class="{ 'checks__dot--done': item.done }" aria-hidden="true">
        <svg v-if="item.done" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2.5 6.2 5 8.5l4.5-5"
            stroke="#fff"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
      <span>{{ item.text }}</span>
      <span class="sr-only">{{ item.done ? '— tamamlandı' : '— bekliyor' }}</span>
    </li>
  </ul>
</template>

<style scoped>
.checks {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checks__item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  color: var(--muted);
}

.checks__item--done {
  color: var(--ink);
  font-weight: 700;
}

.checks__dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 2px dashed #cdb8ae;
}

.checks__dot--done {
  border: none;
  background: var(--teal);
}
</style>
