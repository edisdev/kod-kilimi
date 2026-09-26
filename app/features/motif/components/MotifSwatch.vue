<script setup lang="ts">
import type { MotifCell } from '#domain/Motif'

/**
 * Bir motifi salt okunur gösterir. Kilimdeki karolar, önizleme, adım
 * kartları ve başlıktaki logo aynı bileşeni kullanır.
 */
const props = withDefaults(
  defineProps<{
    cells: readonly MotifCell[]
    /** Kenar uzunluğu (px). Verilmezse kapsayıcıyı doldurur. */
    size?: number | null
    radius?: number
    /** Açıkken ilmekler tek tek dokunuyormuş gibi belirir. */
    weave?: boolean
    /** Dokumanın başlamasından önceki bekleme (ms). Sıralı giriş için. */
    delay?: number
  }>(),
  { size: null, radius: 6, weave: false, delay: 0 },
)

const boxStyle = computed(() => ({
  ...(props.size ? { width: `${props.size}px`, height: `${props.size}px` } : {}),
  borderRadius: `${props.radius}px`,
}))
</script>

<template>
  <div class="motif-swatch" :class="{ 'motif-swatch--weave': weave }" :style="boxStyle" aria-hidden="true">
    <span
      v-for="cell in cells"
      :key="cell.index"
      :style="{
        background: cell.dye.hex,
        // Soldan sağa, yukarıdan aşağıya dokunuyormuş gibi sıra gecikmesi.
        animationDelay: weave ? `${delay + (cell.row + cell.column) * 26}ms` : undefined,
      }"
    />
  </div>
</template>

<style scoped>
.motif-swatch {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  grid-template-rows: repeat(8, minmax(0, 1fr));
  overflow: hidden;
  flex-shrink: 0;
  aspect-ratio: 1;
}

.motif-swatch > span {
  display: block;
}

.motif-swatch--weave > span {
  animation: knot-weave 380ms cubic-bezier(0.2, 1.3, 0.4, 1) both;
}
</style>
