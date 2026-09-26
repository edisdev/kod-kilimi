<script setup lang="ts">
import type { MotifCell } from '#domain/Motif'

/** "Kilime ekle" adımındaki önizleme kartı. */
defineProps<{
  cells: readonly MotifCell[]
  name: string
  city: string
  message: string
}>()
</script>

<template>
  <div class="preview">
    <div class="preview__frame">
      <MotifSwatch :cells="cells" :size="64" :radius="6" />
    </div>
    <div class="preview__who">
      <span class="preview__name">{{ name }}</span>
      <span class="preview__city">{{ city }}</span>
      <span v-if="message" class="preview__message">“{{ message }}”</span>
    </div>
  </div>
</template>

<style scoped>
.preview {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border-radius: 16px;
  background: var(--canvas);
}

.preview__frame {
  flex-shrink: 0;
  border-radius: 6px;
  box-shadow: 0 0 0 3px var(--surface), 0 0 0 4px var(--border);
}

.preview__who {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.preview__name {
  font-weight: 800;
  font-size: 16px;
  overflow-wrap: anywhere;
}

.preview__city {
  font-size: 14px;
  color: var(--muted);
}

.preview__message {
  font-size: 14px;
  font-style: italic;
  color: var(--muted);
  overflow-wrap: anywhere;
}
</style>
