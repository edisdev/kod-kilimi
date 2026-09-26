<script setup lang="ts">
import { Motif } from '#domain/Motif'

/**
 * 8×8 çizim ızgarası.
 *
 * Etkileşim: tıklama, sürükleyerek boyama (fare ve dokunma) ve ok
 * tuşlarıyla gezinme. Her hücre gerçek bir `<button>`; ekran okuyucu
 * satır/sütun bilgisini `aria-label`dan okur.
 *
 * Durum burada tutulmaz — motif yukarıdan gelir, değişiklik `paint`
 * olayıyla yukarı bildirilir.
 */
const props = defineProps<{ motif: Motif }>()
const emit = defineEmits<{
  paint: [index: number]
  /** Yeni bir fırça darbesi başladı — geri alma bunu tek adım sayar. */
  strokeStart: []
}>()

/** Az önce boyanan hücre; kısa bir geri bildirim için. */
const justPainted = ref<number | null>(null)
let clearPaintMark: ReturnType<typeof setTimeout> | null = null

const grid = ref<HTMLElement | null>(null)
const painting = ref(false)
/** Sürükleme sırasında aynı hücreyi defalarca boyamamak için. */
let lastPainted: number | null = null
/** İşaretçiyle en son boyanan hücre ve anı — yinelenen tıklamayı elemek için. */
let lastPointerPainted: number | null = null
let lastPointerAt = 0

const cells = computed(() => props.motif.cells)

function labelFor(row: number, column: number): string {
  return `Satır ${row + 1}, sütun ${column + 1}`
}

function indexAtPoint(x: number, y: number): number | null {
  const element = document.elementFromPoint(x, y)
  const cell = element?.closest<HTMLElement>('[data-cell-index]')
  if (!cell || !grid.value?.contains(cell)) return null
  const index = Number(cell.dataset.cellIndex)
  return Number.isInteger(index) ? index : null
}

function paint(index: number | null) {
  if (index === null || index === lastPainted) return
  lastPainted = index
  lastPointerPainted = index
  lastPointerAt = Date.now()

  justPainted.value = index
  if (clearPaintMark) clearTimeout(clearPaintMark)
  clearPaintMark = setTimeout(() => (justPainted.value = null), 220)

  emit('paint', index)
}

function onPointerDown(event: PointerEvent) {
  emit('strokeStart')
  painting.value = true
  lastPainted = null
  paint(indexAtPoint(event.clientX, event.clientY))
}

function onPointerMove(event: PointerEvent) {
  if (!painting.value) return
  paint(indexAtPoint(event.clientX, event.clientY))
}

function stopPainting() {
  painting.value = false
  lastPainted = null
}

/**
 * Fare ve dokunma zaten `pointerdown` ile işlendiği için buradan yalnızca
 * klavye etkinleştirmesi geçmelidir.
 *
 * `detail === 0` tek başına yetmez: bazı ortamlar (dokunmatikte yardımcı
 * teknolojiyle etkinleştirme) aynı eylem için hem `pointerdown` hem de
 * `detail === 0` bir `click` gönderir. `Motif.paint` aynı boyayı ikinci
 * kez alınca ilmeği sildiği için bu, boyayıp hemen silmek anlamına gelirdi.
 * Bu yüzden az önce işaretçiyle boyanmış bir hücreden gelen tıklama yok
 * sayılır.
 */
function onClick(event: MouseEvent, index: number) {
  if (event.detail !== 0) return
  if (index === lastPointerPainted && Date.now() - lastPointerAt < 700) return
  emit('strokeStart')
  emit('paint', index)
}

/** Ok tuşlarıyla hücreler arasında gezinme. */
function onKeydown(event: KeyboardEvent, index: number) {
  const steps: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -Motif.SIZE,
    ArrowDown: Motif.SIZE,
  }
  const step = steps[event.key]
  if (step === undefined) return

  const column = index % Motif.SIZE
  // Satır başında sola, satır sonunda sağa gitmeyi engelle.
  if (event.key === 'ArrowLeft' && column === 0) return
  if (event.key === 'ArrowRight' && column === Motif.SIZE - 1) return

  const target = index + step
  if (target < 0 || target >= Motif.CELL_COUNT) return

  event.preventDefault()
  grid.value
    ?.querySelector<HTMLButtonElement>(`[data-cell-index="${target}"]`)
    ?.focus()
}

onMounted(() => {
  window.addEventListener('pointerup', stopPainting)
  window.addEventListener('pointercancel', stopPainting)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerup', stopPainting)
  window.removeEventListener('pointercancel', stopPainting)
  if (clearPaintMark) clearTimeout(clearPaintMark)
})
</script>

<template>
  <div
    ref="grid"
    class="motif-editor"
    role="group"
    aria-label="Motif çizim ızgarası, 8 satır 8 sütun"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
  >
    <button
      v-for="cell in cells"
      :key="cell.index"
      :data-cell-index="cell.index"
      type="button"
      class="motif-editor__cell"
      :class="{ 'motif-editor__cell--painted': justPainted === cell.index }"
      :style="{ background: cell.dye.hex }"
      :aria-label="`${labelFor(cell.row, cell.column)}, ${cell.dye.name}`"
      @click="onClick($event, cell.index)"
      @keydown="onKeydown($event, cell.index)"
    />
  </div>
</template>

<style scoped>
.motif-editor {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 2px;
  padding: 6px;
  background: var(--border);
  border-radius: var(--radius-field);
  /* Sürüklerken tarayıcı kaydırma/seçim yapmasın. */
  touch-action: none;
  user-select: none;
}

.motif-editor__cell {
  all: unset;
  display: block;
  aspect-ratio: 1;
  border-radius: 4px;
  cursor: pointer;
  transition: background 120ms linear;
}

.motif-editor__cell--painted {
  animation: paint-pop 220ms ease-out;
  z-index: 1;
}

.motif-editor__cell:focus-visible {
  outline: 3px solid var(--ink);
  outline-offset: 1px;
  z-index: 1;
}
</style>
