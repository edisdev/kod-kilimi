<script setup lang="ts">
import type { Dye } from '#domain/Dye'

/**
 * Sekiz kök boya. Seçili boya koyu çerçeveyle belirtilir.
 * Sıfır numaralı boya zemin rengidir; silgi gibi davranır.
 *
 * ARIA radyo grubu kuralına uyar: sekme sırasında tek durak vardır
 * (seçili boya), gruba girince gezinme ok tuşlarıyla yapılır. Aksi hâlde
 * klavye kullanan biri paleti geçmek için sekiz kez Tab'a basardı.
 */
const props = defineProps<{
  dyes: readonly Dye[]
  selected: number
}>()

const emit = defineEmits<{ pick: [code: number] }>()

const group = ref<HTMLElement | null>(null)

function focusCode(code: number) {
  emit('pick', code)
  nextTick(() => {
    group.value?.querySelector<HTMLButtonElement>(`[data-dye="${code}"]`)?.focus()
  })
}

function onKeydown(event: KeyboardEvent) {
  const steps: Record<string, number> = {
    ArrowRight: 1,
    ArrowDown: 1,
    ArrowLeft: -1,
    ArrowUp: -1,
  }

  const count = props.dyes.length
  const current = props.dyes.findIndex((dye) => dye.code === props.selected)

  if (event.key === 'Home') {
    event.preventDefault()
    focusCode(props.dyes[0]!.code)
    return
  }
  if (event.key === 'End') {
    event.preventDefault()
    focusCode(props.dyes[count - 1]!.code)
    return
  }

  const step = steps[event.key]
  if (step === undefined) return

  event.preventDefault()
  const next = props.dyes[(current + step + count) % count]
  if (next) focusCode(next.code)
}
</script>

<template>
  <div
    ref="group"
    class="dye-picker"
    role="radiogroup"
    aria-label="Kök boya seç"
    @keydown="onKeydown"
  >
    <button
      v-for="dye in dyes"
      :key="dye.code"
      :data-dye="dye.code"
      type="button"
      role="radio"
      class="dye-picker__dye"
      :class="{ 'dye-picker__dye--on': dye.code === selected }"
      :style="{ background: dye.hex }"
      :aria-checked="dye.code === selected"
      :aria-label="dye.name"
      :title="dye.name"
      :tabindex="dye.code === selected ? 0 : -1"
      @click="emit('pick', dye.code)"
    />
  </div>
</template>

<style scoped>
.dye-picker {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 6px;
}

.dye-picker__dye {
  all: unset;
  box-sizing: border-box;
  aspect-ratio: 1;
  min-height: 32px;
  border-radius: 50%;
  cursor: pointer;
  border: 1.5px solid var(--border);
  transition: transform 160ms cubic-bezier(0.2, 1.3, 0.4, 1), border-color 160ms;
}

.dye-picker__dye:hover {
  transform: scale(1.08);
}

.dye-picker__dye--on {
  border: 3px solid var(--ink);
  box-shadow: inset 0 0 0 2px var(--surface);
  transform: scale(1.12);
}

.dye-picker__dye--on:hover {
  transform: scale(1.12);
}

.dye-picker__dye:focus-visible {
  outline: 3px solid var(--ink);
  outline-offset: 3px;
}
</style>
